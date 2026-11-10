package com.afrea.yee.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.UserAccountStatus;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.institutions.entity.Institution;
import com.afrea.yee.institutions.repository.InstitutionReferentRepository;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.institutions.repository.UserInstitutionRepository;
import com.afrea.yee.sync.afrea.AfreaFeedClient;
import com.afrea.yee.sync.afrea.AfreaFeedSnapshot;
import com.afrea.yee.sync.afrea.AfreaPersonMapper;
import com.afrea.yee.sync.afrea.dto.AfreaIdsResponseDto;
import com.afrea.yee.sync.afrea.dto.AfreaInstitutionDto;
import com.afrea.yee.sync.afrea.dto.AfreaMembershipDto;
import com.afrea.yee.sync.afrea.dto.AfreaPersonDto;
import com.afrea.yee.sync.afrea.dto.AfreaSocialLinksDto;
import com.afrea.yee.sync.entity.SyncLog;
import com.afrea.yee.sync.repository.SyncLogRepository;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.json.JsonMapper;

@ExtendWith(MockitoExtension.class)
class AfreaSyncServiceTest {

	@Mock AfreaFeedClient feedClient;
	@Mock SyncLockService syncLockService;
	@Mock SyncLogRepository syncLogRepository;
	@Mock UserRepository userRepository;
	@Mock InstitutionRepository institutionRepository;
	@Mock UserInstitutionRepository userInstitutionRepository;
	@Mock InstitutionReferentRepository referentRepository;

	UserTransformer userTransformer;
	UserMirrorApplier userMirrorApplier;
	UserMirrorMatcher userMirrorMatcher;
	InstitutionMirrorApplier institutionMirrorApplier;
	AfreaPersonMapper personMapper;
	AfreaSyncService service;

	@BeforeEach
	void setUp() {
		userTransformer = new UserTransformer(JsonMapper.builder().build());
		userMirrorApplier = new UserMirrorApplier(userTransformer);
		userMirrorMatcher = new UserMirrorMatcher(userRepository);
		institutionMirrorApplier = new InstitutionMirrorApplier(institutionRepository);
		personMapper = new AfreaPersonMapper();
		service = new AfreaSyncService(
				feedClient,
				personMapper,
				userMirrorApplier,
				userMirrorMatcher,
				institutionMirrorApplier,
				syncLockService,
				syncLogRepository,
				userRepository,
				institutionRepository,
				userInstitutionRepository,
				referentRepository);

		when(syncLockService.acquire(isNull())).thenReturn("owner-1");
		when(syncLogRepository.save(any(SyncLog.class))).thenAnswer(inv -> {
			SyncLog log = inv.getArgument(0);
			if (log.getId() == null) {
				// simulate identity
				try {
					var f = SyncLog.class.getDeclaredField("id");
					f.setAccessible(true);
					f.set(log, 1L);
				} catch (ReflectiveOperationException e) {
					throw new IllegalStateException(e);
				}
			}
			return log;
		});
	}

	@Test
	void createsImportedUserAsAVerifierWithoutPassword() {
		Instant generatedAt = Instant.parse("2026-11-09T16:00:00Z");
		AfreaPersonDto person = samplePerson("2231", "one@example.org", "One");
		AfreaInstitutionDto continent = new AfreaInstitutionDto(
				"afrea-africa", "AfrEA", "continent", null, "Umbrella");

		when(syncLockService.lastSyncAt()).thenReturn(null);
		when(feedClient.fetchAll(isNull())).thenReturn(new AfreaFeedSnapshot(
				generatedAt, List.of(person), List.of(continent), List.of(), List.of()));
		when(feedClient.fetchActiveIds()).thenReturn(new AfreaIdsResponseDto(generatedAt, List.of("2231")));
		when(userRepository.findByExternalId("2231")).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("one@example.org")).thenReturn(Optional.empty());
		when(institutionRepository.findByExternalId("afrea-africa")).thenReturn(Optional.empty());
		when(institutionRepository.existsBySlug(any())).thenReturn(false);
		when(institutionRepository.save(any(Institution.class))).thenAnswer(inv -> {
			Institution i = inv.getArgument(0);
			if (i.getId() == null) {
				setId(i, UUID.randomUUID());
			}
			return i;
		});
		when(userRepository.save(any(User.class))).thenAnswer(inv -> {
			User u = inv.getArgument(0);
			if (u.getId() == null) {
				setId(u, UUID.randomUUID());
			}
			return u;
		});
		when(userRepository.findByExternalIdIsNotNull()).thenReturn(List.of());

		SyncRunResult result = service.run(false);

		assertThat(result.status()).isEqualTo(SyncLog.SUCCESS);
		assertThat(result.created()).isGreaterThanOrEqualTo(2);

		ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
		verify(userRepository, times(2)).save(userCaptor.capture());
		User saved = userCaptor.getAllValues().getFirst();
		assertThat(saved.getExternalId()).isEqualTo("2231");
		assertThat(saved.getStatus()).isEqualTo(UserAccountStatus.A_VERIFIER);
		assertThat(saved.getPasswordHash()).isNull();
		assertThat(saved.isEmailVerified()).isFalse();
		verify(syncLockService).markLastSync(generatedAt);
		verify(syncLockService).release("owner-1");
	}

	@Test
	void secondMatchingByExternalIdUpdatesWithoutDuplicating() {
		Instant generatedAt = Instant.parse("2026-11-09T17:00:00Z");
		User existing = new User();
		setId(existing, UUID.randomUUID());
		existing.setExternalId("2231");
		existing.setEmail("one@example.org");
		existing.setDisplayName("Old");
		existing.setPasswordHash(null);
		existing.setStatus(UserAccountStatus.A_VERIFIER);

		AfreaPersonDto person = samplePerson("2231", "one@example.org", "One Updated");
		when(syncLockService.lastSyncAt()).thenReturn(null);
		when(feedClient.fetchAll(isNull())).thenReturn(new AfreaFeedSnapshot(
				generatedAt, List.of(person), List.of(), List.of(), List.of()));
		when(feedClient.fetchActiveIds()).thenReturn(new AfreaIdsResponseDto(generatedAt, List.of("2231")));
		when(userRepository.findByExternalId("2231")).thenReturn(Optional.of(existing));
		when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
		when(userRepository.findByExternalIdIsNotNull()).thenReturn(List.of(existing));

		SyncRunResult result = service.run(false);

		assertThat(result.created()).isZero();
		assertThat(result.updated()).isGreaterThanOrEqualTo(1);
		assertThat(existing.getDisplayName()).isEqualTo("One Updated");
		assertThat(existing.getStatus()).isEqualTo(UserAccountStatus.A_VERIFIER);
		verify(userRepository, never()).findByEmailIgnoreCase(any());
	}

	@Test
	void deactivatesUsersMissingFromIdsList() {
		Instant generatedAt = Instant.parse("2026-11-09T18:00:00Z");
		User gone = new User();
		setId(gone, UUID.randomUUID());
		gone.setExternalId("9999");
		gone.setEmail("gone@example.org");
		gone.setDisplayName("Gone");
		gone.setStatus(UserAccountStatus.A_VERIFIER);

		when(syncLockService.lastSyncAt()).thenReturn(null);
		when(feedClient.fetchAll(isNull())).thenReturn(new AfreaFeedSnapshot(
				generatedAt, List.of(), List.of(), List.of(), List.of()));
		when(feedClient.fetchActiveIds()).thenReturn(new AfreaIdsResponseDto(generatedAt, List.of("2231")));
		when(userRepository.findByExternalIdIsNotNull()).thenReturn(List.of(gone));
		when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

		service.run(false);

		assertThat(gone.getStatus()).isEqualTo(UserAccountStatus.DESACTIVE);
		assertThat(gone.isAccountDeactivated()).isTrue();
		assertThat(gone.getDeletedAt()).isNotNull();
	}

	private static AfreaPersonDto samplePerson(String externalId, String email, String name) {
		return new AfreaPersonDto(
				externalId,
				email,
				name,
				null,
				null,
				"Ghana",
				null,
				new AfreaSocialLinksDto(null, null, null),
				null,
				null,
				"English",
				new AfreaMembershipDto(MembershipType.INDIVIDUAL, LocalDate.of(2027, 11, 1), false),
				Instant.parse("2026-10-27T14:05:00Z"));
	}

	private static void setId(User user, UUID id) {
		try {
			var f = User.class.getDeclaredField("id");
			f.setAccessible(true);
			f.set(user, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}

	private static void setId(Institution institution, UUID id) {
		try {
			var f = Institution.class.getDeclaredField("id");
			f.setAccessible(true);
			f.set(institution, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}
}
