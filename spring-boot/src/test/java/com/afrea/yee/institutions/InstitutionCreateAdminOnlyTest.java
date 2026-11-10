package com.afrea.yee.institutions;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
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
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

@ExtendWith(MockitoExtension.class)
class InstitutionCreateAdminOnlyTest {

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
	void createRequiresSiteAdmin() {
		UUID actorId = UUID.randomUUID();
		User actor = new User();
		ReflectionTestUtils.setField(actor, "id", actorId);
		when(userRepository.findById(actorId)).thenReturn(Optional.of(actor));
		doThrow(new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN))
				.when(permissions)
				.requireCreateInstitution(actorId);

		ObjectNode body = JsonNodeFactory.instance.objectNode();
		body.put("name", "Club Test");
		body.put("type", "continent");

		assertThatThrownBy(() -> service.create(actorId, body))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> {
					AppException app = (AppException) ex;
					org.assertj.core.api.Assertions.assertThat(app.getCode()).isEqualTo("forbidden");
				});
		verifyNoInteractions(institutionRepository);
	}
}
