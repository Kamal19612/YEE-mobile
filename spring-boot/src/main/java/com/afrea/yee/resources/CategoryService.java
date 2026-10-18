package com.afrea.yee.resources;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.resources.dto.CategoryResponse;
import com.afrea.yee.resources.entity.LibraryCategory;
import com.afrea.yee.resources.repository.LibraryCategoryRepository;
import com.afrea.yee.resources.repository.LibraryResourceRepository;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
public class CategoryService {

	private static final int NAME_MAX = 120;

	private final LibraryCategoryRepository categoryRepository;
	private final LibraryResourceRepository resourceRepository;
	private final UserRepository userRepository;
	private final ApplicationEventPublisher events;

	public CategoryService(
			LibraryCategoryRepository categoryRepository,
			LibraryResourceRepository resourceRepository,
			UserRepository userRepository,
			ApplicationEventPublisher events) {
		this.categoryRepository = categoryRepository;
		this.resourceRepository = resourceRepository;
		this.userRepository = userRepository;
		this.events = events;
	}

	@Transactional(readOnly = true)
	public List<CategoryResponse> list() {
		return categoryRepository.findAllOrdered().stream().map(this::toResponse).toList();
	}

	@Transactional
	public CategoryResponse create(UUID actorId, JsonNode body) {
		requireAdmin(actorId);
		String name = cleanName(body);
		String slug = uniqueSlug(name);
		LibraryCategory category = new LibraryCategory();
		category.setName(name);
		category.setSlug(slug);
		category.setSortOrder(categoryRepository.findMaxSortOrder() + 10);
		CategoryResponse response = toResponse(categoryRepository.save(category));
		events.publishEvent(VisibleDataChanged.resources());
		return response;
	}

	@Transactional
	public CategoryResponse patch(UUID id, UUID actorId, JsonNode body) {
		requireAdmin(actorId);
		LibraryCategory category = categoryRepository
				.findById(id)
				.orElseThrow(() -> new AppException("not_found", "Catégorie introuvable.", HttpStatus.NOT_FOUND));
		if (body.has("name")) {
			String name = cleanName(body);
			category.setName(name);
		}
		if (body.has("sortOrder") && !body.get("sortOrder").isNull()) {
			category.setSortOrder(body.get("sortOrder").asInt(category.getSortOrder()));
		}
		CategoryResponse response = toResponse(categoryRepository.save(category));
		events.publishEvent(VisibleDataChanged.resources());
		return response;
	}

	@Transactional
	public void delete(UUID id, UUID actorId) {
		requireAdmin(actorId);
		LibraryCategory category = categoryRepository
				.findById(id)
				.orElseThrow(() -> new AppException("not_found", "Catégorie introuvable.", HttpStatus.NOT_FOUND));
		long count = resourceRepository.countByCategoryId(id);
		if (count > 0) {
			throw new AppException(
					"category_in_use",
					"Impossible de supprimer une catégorie qui contient encore des ressources.",
					HttpStatus.CONFLICT,
					Map.of("resourceCount", count));
		}
		categoryRepository.delete(category);
		events.publishEvent(VisibleDataChanged.resources());
	}

	LibraryCategory requireCategory(UUID categoryId) {
		return categoryRepository
				.findById(categoryId)
				.orElseThrow(() -> new AppException(
						"validation_failed",
						"La requête contient des données invalides.",
						HttpStatus.UNPROCESSABLE_ENTITY,
						Map.of("fields", Map.of("categoryId", "Catégorie invalide."))));
	}

	LibraryCategory requireCategoryBySlugOrId(String raw) {
		if (raw == null || raw.isBlank()) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("categoryId", "Catégorie obligatoire.")));
		}
		String value = raw.trim();
		try {
			return requireCategory(UUID.fromString(value));
		} catch (IllegalArgumentException ignored) {
			return categoryRepository
					.findBySlug(value.toLowerCase(Locale.ROOT))
					.orElseThrow(() -> new AppException(
							"validation_failed",
							"La requête contient des données invalides.",
							HttpStatus.UNPROCESSABLE_ENTITY,
							Map.of("fields", Map.of("categoryId", "Catégorie invalide."))));
		}
	}

	private CategoryResponse toResponse(LibraryCategory category) {
		long count = resourceRepository.countByCategoryId(category.getId());
		return new CategoryResponse(
				category.getId().toString(),
				category.getSlug(),
				category.getName(),
				category.getSortOrder(),
				count);
	}

	private String cleanName(JsonNode body) {
		String name = body.has("name") ? body.get("name").asString("").replaceAll("<[^>]*>", "").trim() : "";
		if (name.isBlank()) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("name", "Le nom est obligatoire.")));
		}
		if (name.length() > NAME_MAX) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("name", "Le nom ne doit pas dépasser " + NAME_MAX + " caractères.")));
		}
		return name;
	}

	private String uniqueSlug(String name) {
		String base = name.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("^-+|-+$", "");
		if (base.isBlank()) {
			base = "category";
		}
		if (base.length() > 60) {
			base = base.substring(0, 60).replaceAll("-+$", "");
		}
		String slug = base;
		int i = 1;
		while (categoryRepository.existsBySlug(slug)) {
			slug = base + "-" + i++;
		}
		return slug;
	}

	private void requireAdmin(UUID actorId) {
		User actor = userRepository
				.findById(actorId)
				.orElseThrow(() -> new AppException("unauthorized", "Authentification requise.", HttpStatus.UNAUTHORIZED));
		if (actor.isAccountDeleted() || !actor.isSiteAdmin()) {
			throw new AppException("forbidden", "Réservé aux administrateurs.", HttpStatus.FORBIDDEN);
		}
	}
}
