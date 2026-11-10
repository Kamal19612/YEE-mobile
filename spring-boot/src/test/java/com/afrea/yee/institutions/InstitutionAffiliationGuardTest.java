package com.afrea.yee.institutions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.institutions.entity.Institution;
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
class InstitutionAffiliationGuardTest {

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
	void requestAffiliationBlockedWhenPending() {
		UUID institutionId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		Institution institution = new Institution();
		ReflectionTestUtils.setField(institution, "id", institutionId);
		institution.setCreationStatus(InstitutionCreationStatus.PENDING);
		when(institutionRepository.findNotDeletedById(institutionId)).thenReturn(Optional.of(institution));

		assertThatThrownBy(() -> service.requestAffiliation(institutionId, userId))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> {
					AppException app = (AppException) ex;
					assertThat(app.getCode()).isEqualTo("institution_not_available");
					assertThat(app.getStatus()).isEqualTo(HttpStatus.CONFLICT);
					assertThat(app.getMessage()).contains("adhésions");
				});
	}
}
