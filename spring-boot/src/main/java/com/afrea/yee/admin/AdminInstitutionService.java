package com.afrea.yee.admin;

import com.afrea.yee.admin.dto.AdminInstitutionListItemResponse;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.institutions.InstitutionCreationStatus;
import com.afrea.yee.institutions.entity.Institution;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminInstitutionService {

	private static final Set<String> CREATION_FILTERS = Set.of(
			"all",
			InstitutionCreationStatus.PENDING,
			InstitutionCreationStatus.CREEE,
			InstitutionCreationStatus.REJETEE);

	private final InstitutionRepository institutionRepository;
	private final ApplicationEventPublisher events;

	public AdminInstitutionService(
			InstitutionRepository institutionRepository,
			ApplicationEventPublisher events) {
		this.institutionRepository = institutionRepository;
		this.events = events;
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<AdminInstitutionListItemResponse>> list(
			String q,
			String creationStatus,
			int page,
			int perPage) {
		String statusFilter = normalizeCreationStatus(creationStatus);
		String query = q == null ? "" : q.trim();
		String statusParam = "all".equals(statusFilter) ? null : statusFilter;
		PageRequest pr = PageRequest.of(Math.max(0, page - 1), perPage);
		Page<Institution> result = institutionRepository.adminSearch(query, statusParam, pr);
		List<AdminInstitutionListItemResponse> items = result.getContent().stream()
				.map(this::toListItem)
				.toList();
		return ApiResponse.ok(items, Map.of(
				"page", page,
				"perPage", perPage,
				"total", result.getTotalElements(),
				"totalPages", result.getTotalPages()));
	}

	@Transactional(readOnly = true)
	public AdminInstitutionListItemResponse get(UUID id) {
		return toListItem(requireNotDeleted(id));
	}

	@Transactional
	public Map<String, Object> create(UUID id) {
		Institution institution = requireNotDeleted(id);
		String current = institution.getCreationStatus();
		if (InstitutionCreationStatus.CREEE.equals(current)) {
			return Map.of(
					"created", 0,
					"skipped", 1,
					"creationStatus", current,
					"message", "Institution déjà créée.");
		}
		if (!InstitutionCreationStatus.PENDING.equals(current)
				&& !InstitutionCreationStatus.REJETEE.equals(current)) {
			throw new AppException(
					"invalid_creation_status",
					"Statut de création invalide.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		institution.setCreationStatus(InstitutionCreationStatus.CREEE);
		events.publishEvent(VisibleDataChanged.institutions());
		return Map.of(
				"created", 1,
				"skipped", 0,
				"creationStatus", InstitutionCreationStatus.CREEE,
				"message", "Institution créée et visible dans l’annuaire.");
	}

	@Transactional
	public Map<String, Object> reject(UUID id) {
		Institution institution = requireNotDeleted(id);
		String current = institution.getCreationStatus();
		if (InstitutionCreationStatus.REJETEE.equals(current)) {
			return Map.of(
					"rejected", 0,
					"skipped", 1,
					"creationStatus", current,
					"message", "Institution déjà rejetée.");
		}
		if (!InstitutionCreationStatus.PENDING.equals(current)) {
			throw new AppException(
					"invalid_creation_status",
					"Seules les institutions en attente peuvent être rejetées.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		institution.setCreationStatus(InstitutionCreationStatus.REJETEE);
		events.publishEvent(VisibleDataChanged.institutions());
		return Map.of(
				"rejected", 1,
				"skipped", 0,
				"creationStatus", InstitutionCreationStatus.REJETEE,
				"message", "Institution rejetée : elle reste hors annuaire.");
	}

	@Transactional
	public Map<String, Object> createMany(List<UUID> ids) {
		if (ids == null || ids.isEmpty()) {
			throw new AppException("validation_failed", "ids requis.", HttpStatus.UNPROCESSABLE_ENTITY);
		}
		int created = 0;
		int skipped = 0;
		for (UUID id : ids) {
			Map<String, Object> one = create(id);
			created += ((Number) one.get("created")).intValue();
			skipped += ((Number) one.get("skipped")).intValue();
		}
		return Map.of("created", created, "skipped", skipped);
	}

	private Institution requireNotDeleted(UUID id) {
		return institutionRepository.findNotDeletedById(id)
				.orElseThrow(() -> new AppException(
						"not_found",
						"Institution introuvable.",
						HttpStatus.NOT_FOUND));
	}

	private String normalizeCreationStatus(String raw) {
		if (raw == null || raw.isBlank() || "all".equalsIgnoreCase(raw.trim())) {
			return "all";
		}
		String normalized = raw.trim().toUpperCase(Locale.ROOT);
		if (!CREATION_FILTERS.contains(normalized)) {
			throw new AppException(
					"invalid_status",
					"Statut invalide. Valeurs : all, PENDING, CREEE, REJETEE.",
					HttpStatus.BAD_REQUEST);
		}
		return normalized;
	}

	private AdminInstitutionListItemResponse toListItem(Institution i) {
		return new AdminInstitutionListItemResponse(
				i.getId().toString(),
				i.getExternalId(),
				i.getParentId() == null ? null : i.getParentId().toString(),
				i.getType(),
				i.getName(),
				i.getSlug(),
				i.getDescription(),
				i.getCreationStatus(),
				i.getMembersCount(),
				i.getCreatedAt() == null ? null : i.getCreatedAt().toString(),
				null);
	}
}
