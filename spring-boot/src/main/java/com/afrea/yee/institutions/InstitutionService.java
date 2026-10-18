package com.afrea.yee.institutions;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.institutions.dto.AffiliationMemberResponse;
import com.afrea.yee.institutions.dto.AffiliationUserResponse;
import com.afrea.yee.institutions.dto.InstitutionResponse;
import com.afrea.yee.institutions.entity.Institution;
import com.afrea.yee.institutions.entity.InstitutionReferent;
import com.afrea.yee.institutions.entity.UserInstitution;
import com.afrea.yee.institutions.repository.InstitutionReferentRepository;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.institutions.repository.UserInstitutionRepository;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

@Service
public class InstitutionService {

	private final InstitutionRepository institutionRepository;
	private final InstitutionReferentRepository referentRepository;
	private final UserInstitutionRepository userInstitutionRepository;
	private final UserRepository userRepository;
	private final InstitutionPermissions permissions;
	private final UserTransformer userTransformer;
	private final ApplicationEventPublisher events;
	private final WriteRateLimit writeRateLimit;

	public InstitutionService(
			InstitutionRepository institutionRepository,
			InstitutionReferentRepository referentRepository,
			UserInstitutionRepository userInstitutionRepository,
			UserRepository userRepository,
			InstitutionPermissions permissions,
			UserTransformer userTransformer,
			ApplicationEventPublisher events,
			WriteRateLimit writeRateLimit) {
		this.institutionRepository = institutionRepository;
		this.referentRepository = referentRepository;
		this.userInstitutionRepository = userInstitutionRepository;
		this.userRepository = userRepository;
		this.permissions = permissions;
		this.userTransformer = userTransformer;
		this.events = events;
		this.writeRateLimit = writeRateLimit;
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<InstitutionResponse>> list(
			UUID parentId,
			String type,
			String search,
			UUID userId,
			String status,
			boolean referentOnly,
			UUID viewerId) {
		if (referentOnly) {
			if (viewerId == null) {
				throw new AppException("unauthorized", "Authentication required", HttpStatus.UNAUTHORIZED);
			}
			if (permissions.isSiteAdmin(viewerId)) {
				List<Institution> institutions;
				if (parentId != null) {
					institutions = institutionRepository.findChildren(parentId, search);
				} else if (type != null && !type.isBlank()) {
					institutions = institutionRepository.findByType(type, search);
				} else {
					institutions = institutionRepository.findAllActive(search);
				}
				return ApiResponse.ok(toResponses(institutions, viewerId, Map.of()));
			}
			List<UUID> ids = institutionRepository.findIdsWithReferentAuthority(viewerId);
			List<Institution> institutions = ids.isEmpty() ? List.of() : institutionRepository.findActiveByIds(ids);
			return ApiResponse.ok(toResponses(filterListed(institutions, parentId, type, search), viewerId, Map.of()));
		}

		if (userId != null) {
			String st = status == null || status.isBlank() ? "active" : status.trim();
			String statusFilter = "all".equalsIgnoreCase(st) ? null : st;
			List<UserInstitution> affiliations = userInstitutionRepository.findByUserAndOptionalStatus(userId, statusFilter);
			Map<UUID, String> affiliationByInst = new HashMap<>();
			List<Institution> institutions = affiliations.stream()
					.map(ui -> {
						affiliationByInst.put(ui.getInstitution().getId(), ui.getStatus());
						return ui.getInstitution();
					})
					.toList();
			return ApiResponse.ok(toResponses(institutions, viewerId, affiliationByInst));
		}

		List<Institution> institutions;
		if (parentId != null) {
			institutions = institutionRepository.findChildren(parentId, search);
		} else if (type != null && !type.isBlank()) {
			institutions = institutionRepository.findByType(type, search);
		} else {
			institutions = institutionRepository.findRoots(search);
		}
		return ApiResponse.ok(toResponses(institutions, viewerId, Map.of()));
	}

	@Transactional(readOnly = true)
	public InstitutionResponse get(UUID id, UUID viewerId) {
		Institution institution = requireActive(id);
		return toResponses(List.of(institution), viewerId, Map.of()).getFirst();
	}

	@Transactional
	public InstitutionResponse create(UUID actorId, JsonNode body) {
		writeRateLimit.checkCreateInstitution(actorId);
		User actor = requireUser(actorId);
		String name = text(body, "name");
		String description = body.has("description") ? text(body, "description") : "";
		String type = text(body, "type");
		UUID parentId = body.has("parentId") && !body.get("parentId").isNull()
				? UUID.fromString(body.get("parentId").asString())
				: null;

		if (name.length() < 2 || name.length() > 160) {
			throw validation("name", "Le nom doit contenir entre 2 et 160 caractères.");
		}
		if (!Set.of("continent", "country", "local").contains(type)) {
			throw validation("type", "Type invalide.");
		}

		Institution parent = null;
		if ("continent".equals(type)) {
			if (parentId != null) {
				throw validation("parentId", "Un continent n’a pas de parent.");
			}
			permissions.requireCreateContinent(actorId);
		} else {
			if (parentId == null) {
				throw validation("parentId", "parentId requis.");
			}
			parent = requireActive(parentId);
			if ("country".equals(type) && !"continent".equals(parent.getType())) {
				throw validation("parentId", "Un pays doit avoir un continent pour parent.");
			}
			if ("local".equals(type) && !"country".equals(parent.getType())) {
				throw validation("parentId", "Un club doit avoir un pays pour parent.");
			}
			permissions.requireCreateChild(parent, actorId);
		}

		Institution institution = new Institution();
		institution.setName(name);
		institution.setSlug(uniqueSlug(name));
		institution.setDescription(description);
		institution.setType(type);
		institution.setParent(parent);
		institution.setCreatedBy(actor);
		institution.setMembersCount(1);
		institutionRepository.save(institution);

		InstitutionReferent referent = new InstitutionReferent();
		referent.setInstitution(institution);
		referent.setUser(actor);
		referentRepository.save(referent);

		UserInstitution affiliation = new UserInstitution();
		affiliation.setInstitution(institution);
		affiliation.setUser(actor);
		affiliation.setStatus("active");
		userInstitutionRepository.save(affiliation);
		events.publishEvent(VisibleDataChanged.institutions());

		return toResponses(List.of(institution), actorId, Map.of(institution.getId(), "active")).getFirst();
	}

	@Transactional
	public InstitutionResponse patch(UUID id, UUID actorId, JsonNode body) {
		Institution institution = requireActive(id);
		permissions.requireManage(institution, actorId);
		if (body.has("name")) {
			String name = text(body, "name");
			if (name.length() < 2 || name.length() > 160) {
				throw validation("name", "Le nom doit contenir entre 2 et 160 caractères.");
			}
			institution.setName(name);
		}
		if (body.has("description")) {
			institution.setDescription(text(body, "description"));
		}
		events.publishEvent(VisibleDataChanged.institutions());
		return toResponses(List.of(institution), actorId, Map.of()).getFirst();
	}

	@Transactional
	public void delete(UUID id, UUID actorId) {
		Institution institution = requireActive(id);
		permissions.requireManage(institution, actorId);
		if (institutionRepository.hasActiveChildren(id)) {
			throw new AppException(
					"has_children",
					"Impossible de supprimer une institution qui a des enfants.",
					HttpStatus.CONFLICT);
		}
		institution.setDeletedAt(Instant.now());
		events.publishEvent(new InstitutionDeletedEvent(id));
	}

	@Transactional
	public Map<String, String> requestAffiliation(UUID institutionId, UUID userId) {
		Institution institution = requireActive(institutionId);
		User user = requireUser(userId);
		Optional<UserInstitution> existing = userInstitutionRepository.findByInstitutionIdAndUserId(institutionId, userId);
		if (existing.isPresent()) {
			UserInstitution ui = existing.get();
			if ("active".equals(ui.getStatus()) || "pending".equals(ui.getStatus())) {
				return Map.of("status", ui.getStatus());
			}
			ui.setStatus("pending");
			events.publishEvent(new InstitutionAffiliationRequestEvent(institutionId, userId));
			events.publishEvent(VisibleDataChanged.institutions());
			return Map.of("status", "pending");
		}
		UserInstitution ui = new UserInstitution();
		ui.setInstitution(institution);
		ui.setUser(user);
		ui.setStatus("pending");
		userInstitutionRepository.save(ui);
		events.publishEvent(new InstitutionAffiliationRequestEvent(institutionId, userId));
		events.publishEvent(VisibleDataChanged.institutions());
		return Map.of("status", "pending");
	}

	@Transactional
	public void cancelAffiliation(UUID institutionId, UUID userId) {
		UserInstitution ui = userInstitutionRepository.findByInstitutionIdAndUserId(institutionId, userId)
				.orElseThrow(() -> new AppException("not_found", "Affiliation introuvable.", HttpStatus.NOT_FOUND));
		ensureNotLastDirectReferent(institutionId, userId);
		boolean wasActive = "active".equals(ui.getStatus());
		userInstitutionRepository.delete(ui);
		dropReferent(institutionId, userId);
		if (wasActive) {
			institutionRepository.adjustMembers(institutionId, -1);
		}
		events.publishEvent(VisibleDataChanged.institutions());
	}

	@Transactional
	public void excludeMember(UUID institutionId, UUID actorId, UUID targetUserId) {
		Institution institution = requireActive(institutionId);
		permissions.requireManage(institution, actorId);
		UserInstitution ui = userInstitutionRepository.findByInstitutionIdAndUserId(institutionId, targetUserId)
				.orElseThrow(() -> new AppException("not_found", "Affiliation introuvable.", HttpStatus.NOT_FOUND));
		ensureNotLastDirectReferent(institutionId, targetUserId);
		boolean wasActive = "active".equals(ui.getStatus());
		userInstitutionRepository.delete(ui);
		dropReferent(institutionId, targetUserId);
		if (wasActive) {
			institutionRepository.adjustMembers(institutionId, -1);
		}
		events.publishEvent(VisibleDataChanged.institutions());
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<AffiliationMemberResponse>> listAffiliations(
			UUID institutionId,
			String status,
			UUID viewerId) {
		Institution institution = requireActive(institutionId);
		String requested = status == null || status.isBlank() ? null : status.trim();
		boolean wantsRestricted = requested == null
				|| "pending".equals(requested)
				|| "rejected".equals(requested)
				|| "all".equalsIgnoreCase(requested);
		boolean canManage = viewerId != null && permissions.isReferentWithCascade(institution.getId(), viewerId);
		if (wantsRestricted && !canManage) {
			if ("pending".equals(requested) || "rejected".equals(requested) || "all".equalsIgnoreCase(requested)) {
				throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
			}
			requested = "active";
		}

		String statusFilter = "all".equalsIgnoreCase(requested) ? null : requested;
		List<UserInstitution> rows = userInstitutionRepository.findByInstitutionAndOptionalStatus(
				institutionId, statusFilter);
		Set<UUID> referentIds = new HashSet<>(referentRepository.findDirectReferentUserIds(institutionId));
		List<AffiliationMemberResponse> data = rows.stream()
				.map(ui -> toAffiliationResponse(ui, referentIds.contains(ui.getUser().getId())))
				.toList();
		return ApiResponse.ok(data);
	}

	@Transactional
	public Map<String, String> approve(UUID institutionId, UUID actorId, UUID targetUserId) {
		return resolve(institutionId, actorId, targetUserId, true);
	}

	@Transactional
	public Map<String, String> reject(UUID institutionId, UUID actorId, UUID targetUserId) {
		return resolve(institutionId, actorId, targetUserId, false);
	}

	@Transactional
	public Map<String, String> addReferent(UUID institutionId, UUID actorId, UUID targetUserId) {
		Institution institution = requireActive(institutionId);
		permissions.requireManage(institution, actorId);
		User target = userRepository.findById(targetUserId)
				.filter(u -> !u.isAccountDeactivated() && !u.isAccountDeleted())
				.orElseThrow(() -> new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
		ensureActiveAffiliation(institution, target);
		if (!referentRepository.existsByInstitutionIdAndUserId(institutionId, targetUserId)) {
			InstitutionReferent referent = new InstitutionReferent();
			referent.setInstitution(institution);
			referent.setUser(target);
			referentRepository.save(referent);
		}
		events.publishEvent(VisibleDataChanged.institutions());
		return Map.of("status", "referent");
	}

	@Transactional
	public void removeReferent(UUID institutionId, UUID actorId, UUID targetUserId) {
		Institution institution = requireActive(institutionId);
		permissions.requireManage(institution, actorId);
		InstitutionReferent referent = referentRepository.findByInstitutionIdAndUserId(institutionId, targetUserId)
				.orElseThrow(() -> new AppException("not_found", "Référent introuvable.", HttpStatus.NOT_FOUND));
		ensureNotLastDirectReferent(institutionId, targetUserId);
		referentRepository.delete(referent);
		events.publishEvent(VisibleDataChanged.institutions());
	}

	private Map<String, String> resolve(UUID institutionId, UUID actorId, UUID targetUserId, boolean approve) {
		Institution institution = requireActive(institutionId);
		permissions.requireManage(institution, actorId);
		UserInstitution ui = userInstitutionRepository.findByInstitutionIdAndUserId(institutionId, targetUserId)
				.orElseThrow(() -> new AppException("not_found", "Demande introuvable.", HttpStatus.NOT_FOUND));
		if (!"pending".equals(ui.getStatus())) {
			throw new AppException("validation_failed", "Pas de demande en attente.", HttpStatus.UNPROCESSABLE_ENTITY);
		}
		if (approve) {
			ui.setStatus("active");
			institutionRepository.bumpMembers(institutionId, 1);
		} else {
			ui.setStatus("rejected");
		}
		events.publishEvent(new InstitutionAffiliationResolvedEvent(targetUserId, institutionId, approve));
		events.publishEvent(VisibleDataChanged.institutions());
		return Map.of("status", approve ? "active" : "rejected");
	}

	private void ensureActiveAffiliation(Institution institution, User target) {
		Optional<UserInstitution> existing = userInstitutionRepository.findByInstitutionIdAndUserId(
				institution.getId(), target.getId());
		if (existing.isEmpty()) {
			UserInstitution ui = new UserInstitution();
			ui.setInstitution(institution);
			ui.setUser(target);
			ui.setStatus("active");
			userInstitutionRepository.save(ui);
			institutionRepository.bumpMembers(institution.getId(), 1);
			return;
		}
		UserInstitution ui = existing.get();
		if ("active".equals(ui.getStatus())) {
			return;
		}
		ui.setStatus("active");
		institutionRepository.bumpMembers(institution.getId(), 1);
	}

	private void ensureNotLastDirectReferent(UUID institutionId, UUID userId) {
		if (!referentRepository.existsByInstitutionIdAndUserId(institutionId, userId)) {
			return;
		}
		if (referentRepository.countByInstitutionId(institutionId) <= 1) {
			throw new AppException(
					"last_referent",
					"Nommez un autre référent avant de retirer le dernier.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
	}

	private void dropReferent(UUID institutionId, UUID userId) {
		referentRepository.findByInstitutionIdAndUserId(institutionId, userId)
				.ifPresent(referentRepository::delete);
	}

	private AffiliationMemberResponse toAffiliationResponse(UserInstitution ui, boolean isReferent) {
		User u = ui.getUser();
		String avatar = userTransformer.resolveAvatarUrl(u);
		String profession = u.getProfession() == null ? "" : u.getProfession();
		String requestedAt = ui.getCreatedAt() == null ? null : ui.getCreatedAt().toString();
		String decidedAt = null;
		if (("active".equals(ui.getStatus()) || "rejected".equals(ui.getStatus())) && ui.getUpdatedAt() != null) {
			decidedAt = ui.getUpdatedAt().toString();
		}
		AffiliationUserResponse user = new AffiliationUserResponse(
				u.getId().toString(),
				u.getDisplayName(),
				avatar,
				u.getCoverUrl(),
				profession);
		return new AffiliationMemberResponse(
				u.getId().toString(),
				u.getDisplayName(),
				avatar,
				profession,
				ui.getStatus(),
				isReferent,
				requestedAt,
				decidedAt,
				user);
	}

	private List<InstitutionResponse> toResponses(
			List<Institution> institutions,
			UUID viewerId,
			Map<UUID, String> affiliationOverrides) {
		if (institutions.isEmpty()) {
			return List.of();
		}

		AncestryMap ancestry = batchResolveAncestry(institutions);

		Map<UUID, String> viewerAffiliations = new HashMap<>();
		Set<UUID> authorityIds = Set.of();
		List<UUID> ids = institutions.stream().map(Institution::getId).toList();
		if (viewerId != null) {
			for (UserInstitution ui : userInstitutionRepository.findViewerAffiliations(viewerId, ids)) {
				viewerAffiliations.put(ui.getInstitution().getId(), ui.getStatus());
			}
			if (permissions.isSiteAdmin(viewerId)) {
				authorityIds = new HashSet<>(ids);
			} else {
				authorityIds = new HashSet<>(institutionRepository.findIdsWithReferentAuthority(viewerId));
			}
		}

		Set<UUID> finalAuthorityIds = authorityIds;
		return institutions.stream().map(i -> {
			boolean viewerIsReferent = viewerId != null && finalAuthorityIds.contains(i.getId());
			String viewerAff = viewerAffiliations.getOrDefault(i.getId(), "none");
			AncestryNames names = ancestry.names.getOrDefault(i.getId(), AncestryNames.EMPTY);
			return new InstitutionResponse(
					i.getId().toString(),
					i.getParentId() == null ? null : i.getParentId().toString(),
					i.getType(),
					i.getName(),
					i.getSlug(),
					i.getDescription(),
					i.getMembersCount(),
					i.getCreatedAt().toString(),
					viewerAff,
					viewerIsReferent,
					names.countryName,
					names.continentName,
					affiliationOverrides.get(i.getId()));
		}).toList();
	}

	private List<Institution> filterListed(
			List<Institution> institutions,
			UUID parentId,
			String type,
			String search) {
		return institutions.stream()
				.filter(i -> parentId == null || parentId.equals(i.getParentId()))
				.filter(i -> type == null || type.isBlank() || type.equals(i.getType()))
				.filter(i -> {
					if (search == null || search.isBlank()) {
						return true;
					}
					return i.getName() != null
							&& i.getName().toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT));
				})
				.toList();
	}

	/**
	 * Résolution par lot des noms d'ancêtres (countryName / continentName).
	 */
	private AncestryMap batchResolveAncestry(List<Institution> institutions) {
		Map<UUID, Institution> byId = new HashMap<>();
		for (Institution i : institutions) {
			byId.put(i.getId(), i);
			if (i.getParent() != null) {
				byId.put(i.getParent().getId(), i.getParent());
			}
		}

		Set<UUID> needed = new HashSet<>();
		for (Institution i : institutions) {
			if (i.getParentId() != null) {
				needed.add(i.getParentId());
			}
		}
		for (UUID id : List.copyOf(needed)) {
			Institution p = byId.get(id);
			if (p != null && p.getParentId() != null) {
				needed.add(p.getParentId());
			}
		}
		needed.removeAll(byId.keySet());
		if (!needed.isEmpty()) {
			for (Institution loaded : institutionRepository.findActiveByIds(needed)) {
				byId.put(loaded.getId(), loaded);
			}
			Set<UUID> stillMissing = new HashSet<>();
			for (Institution i : byId.values()) {
				if (i.getParentId() != null && !byId.containsKey(i.getParentId())) {
					stillMissing.add(i.getParentId());
				}
			}
			if (!stillMissing.isEmpty()) {
				institutionRepository.findActiveByIds(stillMissing).forEach(x -> byId.put(x.getId(), x));
			}
		}

		Map<UUID, AncestryNames> names = new HashMap<>();
		for (Institution i : institutions) {
			String countryName = null;
			String continentName = null;
			if ("local".equals(i.getType())) {
				Institution country = i.getParent() != null ? i.getParent() : byId.get(i.getParentId());
				if (country != null) {
					countryName = country.getName();
					UUID continentId = country.getParentId();
					Institution continent = continentId == null ? null : byId.get(continentId);
					if (continent == null && country.getParent() != null) {
						continent = country.getParent();
					}
					if (continent != null) {
						continentName = continent.getName();
					}
				}
			} else if ("country".equals(i.getType())) {
				Institution continent = i.getParent() != null ? i.getParent() : byId.get(i.getParentId());
				if (continent != null) {
					continentName = continent.getName();
				}
			}
			names.put(i.getId(), new AncestryNames(countryName, continentName));
		}
		return new AncestryMap(names);
	}

	private Institution requireActive(UUID id) {
		return institutionRepository.findActiveById(id)
				.orElseThrow(() -> new AppException("not_found", "Institution introuvable.", HttpStatus.NOT_FOUND));
	}

	private User requireUser(UUID id) {
		return userRepository.findById(id)
				.orElseThrow(() -> new AppException("unauthorized", "Authentication required", HttpStatus.UNAUTHORIZED));
	}

	private String uniqueSlug(String name) {
		String base = name.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("^-+|-+$", "");
		if (base.isBlank()) {
			base = "institution";
		}
		String slug = base;
		int i = 1;
		while (institutionRepository.existsBySlug(slug)) {
			slug = base + "-" + i++;
		}
		return slug;
	}

	private static String text(JsonNode body, String field) {
		return body.has(field) && !body.get(field).isNull() ? body.get(field).asString("").trim() : "";
	}

	private static AppException validation(String field, String message) {
		return new AppException(
				"validation_failed",
				"La requête contient des données invalides.",
				HttpStatus.UNPROCESSABLE_ENTITY,
				Map.of("fields", Map.of(field, message)));
	}

	private record AncestryNames(String countryName, String continentName) {
		static final AncestryNames EMPTY = new AncestryNames(null, null);
	}

	private record AncestryMap(Map<UUID, AncestryNames> names) {
	}
}
