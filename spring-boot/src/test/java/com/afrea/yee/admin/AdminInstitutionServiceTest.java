package com.afrea.yee.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.institutions.InstitutionCreationStatus;
import com.afrea.yee.institutions.entity.Institution;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminInstitutionServiceTest {

	@Mock InstitutionRepository institutionRepository;
	@Mock ApplicationEventPublisher events;

	AdminInstitutionService service;

	@BeforeEach
	void setUp() {
		service = new AdminInstitutionService(institutionRepository, events);
	}

	@Test
	void createMovesPendingToCreee() {
		UUID id = UUID.randomUUID();
		Institution institution = pending(id);
		when(institutionRepository.findNotDeletedById(id)).thenReturn(Optional.of(institution));

		Map<String, Object> result = service.create(id);

		assertThat(result.get("created")).isEqualTo(1);
		assertThat(institution.getCreationStatus()).isEqualTo(InstitutionCreationStatus.CREEE);
		ArgumentCaptor<Object> event = ArgumentCaptor.forClass(Object.class);
		verify(events).publishEvent(event.capture());
		assertThat(event.getValue()).isInstanceOf(VisibleDataChanged.class);
	}

	@Test
	void rejectMovesPendingToRejetee() {
		UUID id = UUID.randomUUID();
		Institution institution = pending(id);
		when(institutionRepository.findNotDeletedById(id)).thenReturn(Optional.of(institution));

		Map<String, Object> result = service.reject(id);

		assertThat(result.get("rejected")).isEqualTo(1);
		assertThat(institution.getCreationStatus()).isEqualTo(InstitutionCreationStatus.REJETEE);
	}

	@Test
	void rejectFailsOnCreee() {
		UUID id = UUID.randomUUID();
		Institution institution = pending(id);
		institution.setCreationStatus(InstitutionCreationStatus.CREEE);
		when(institutionRepository.findNotDeletedById(id)).thenReturn(Optional.of(institution));

		assertThatThrownBy(() -> service.reject(id))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> {
					AppException app = (AppException) ex;
					assertThat(app.getCode()).isEqualTo("invalid_creation_status");
					assertThat(app.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
				});
	}

	private static Institution pending(UUID id) {
		Institution institution = new Institution();
		ReflectionTestUtils.setField(institution, "id", id);
		institution.setName("AfrEA Secretariat");
		institution.setSlug("afrea-secretariat");
		institution.setType("local");
		institution.setExternalId("inst-65");
		institution.setCreationStatus(InstitutionCreationStatus.PENDING);
		return institution;
	}
}
