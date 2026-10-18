package com.afrea.yee.institutions;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.institutions.entity.Institution;
import com.afrea.yee.institutions.entity.UserInstitution;
import com.afrea.yee.institutions.repository.InstitutionReferentRepository;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.institutions.repository.UserInstitutionRepository;
import com.afrea.yee.users.UserTransformer;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class InstitutionServiceGuardTest {

	@Mock InstitutionRepository institutionRepository;
	@Mock InstitutionReferentRepository referentRepository;
	@Mock UserInstitutionRepository userInstitutionRepository;
	@Mock UserRepository userRepository;
	@Mock InstitutionPermissions permissions;
	@Mock UserTransformer userTransformer;
	@Mock ApplicationEventPublisher events;
	@Mock WriteRateLimit writeRateLimit;

	InstitutionService service;

	@BeforeEach
	void setUp() {
		service = new InstitutionService(
				institutionRepository,
				referentRepository,
				userInstitutionRepository,
				userRepository,
				permissions,
				userTransformer,
				events,
				writeRateLimit);
	}

	@Test
	void lastDirectReferentCannotLeave() {
		UUID institutionId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		UserInstitution ui = affiliation(institutionId, userId, "active");
		when(userInstitutionRepository.findByInstitutionIdAndUserId(institutionId, userId))
				.thenReturn(Optional.of(ui));
		when(referentRepository.existsByInstitutionIdAndUserId(institutionId, userId)).thenReturn(true);
		when(referentRepository.countByInstitutionId(institutionId)).thenReturn(1L);

		assertThatThrownBy(() -> service.cancelAffiliation(institutionId, userId))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> {
					AppException app = (AppException) ex;
					org.assertj.core.api.Assertions.assertThat(app.getCode()).isEqualTo("last_referent");
					org.assertj.core.api.Assertions.assertThat(app.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
				});
		verify(userInstitutionRepository, never()).delete(ui);
	}

	@Test
	void pendingListRequiresManage() {
		UUID institutionId = UUID.randomUUID();
		UUID viewerId = UUID.randomUUID();
		Institution institution = new Institution();
		ReflectionTestUtils.setField(institution, "id", institutionId);
		when(institutionRepository.findActiveById(institutionId)).thenReturn(Optional.of(institution));
		when(permissions.isReferentWithCascade(institutionId, viewerId)).thenReturn(false);

		assertThatThrownBy(() -> service.listAffiliations(institutionId, "pending", viewerId))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> org.assertj.core.api.Assertions
						.assertThat(((AppException) ex).getStatus())
						.isEqualTo(HttpStatus.FORBIDDEN));
	}

	private static UserInstitution affiliation(UUID institutionId, UUID userId, String status) {
		Institution institution = new Institution();
		ReflectionTestUtils.setField(institution, "id", institutionId);
		User user = new User();
		ReflectionTestUtils.setField(user, "id", userId);
		UserInstitution ui = new UserInstitution();
		ui.setInstitution(institution);
		ui.setUser(user);
		ui.setStatus(status);
		return ui;
	}
}
