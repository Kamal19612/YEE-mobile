package com.afrea.yee.groups;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.groups.dto.GroupMemberResponse;
import com.afrea.yee.groups.dto.GroupResponse;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.entity.GroupMember;
import com.afrea.yee.feed.repository.PostRepository;
import com.afrea.yee.groups.repository.GroupMemberRepository;
import com.afrea.yee.groups.repository.GroupRepository;
import com.afrea.yee.institutions.InstitutionAuthorityChecker;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.util.HashMap;
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
public class GroupService {

	private final GroupRepository groupRepository;
	private final GroupMemberRepository groupMemberRepository;
	private final UserRepository userRepository;
	private final GroupPermissions permissions;
	private final InstitutionAuthorityChecker institutionAuthorityChecker;
	private final UserTransformer userTransformer;
	private final ApplicationEventPublisher events;
	private final PostRepository postRepository;
	private final WriteRateLimit writeRateLimit;

	public GroupService(
			GroupRepository groupRepository,
			GroupMemberRepository groupMemberRepository,
			UserRepository userRepository,
			GroupPermissions permissions,
			InstitutionAuthorityChecker institutionAuthorityChecker,
			UserTransformer userTransformer,
			ApplicationEventPublisher events,
			PostRepository postRepository,
			WriteRateLimit writeRateLimit) {
		this.groupRepository = groupRepository;
		this.groupMemberRepository = groupMemberRepository;
		this.userRepository = userRepository;
		this.permissions = permissions;
		this.institutionAuthorityChecker = institutionAuthorityChecker;
		this.userTransformer = userTransformer;
		this.events = events;
		this.postRepository = postRepository;
		this.writeRateLimit = writeRateLimit;
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<GroupResponse>> list(String search, boolean mine, UUID userId, UUID viewerId) {
		if (userId != null) {
			return ApiResponse.ok(listForUser(userId, viewerId));
		}
		List<GroupEntity> groups;
		if (mine) {
			if (viewerId == null) {
				throw new AppException("unauthorized", "Authentication required", HttpStatus.UNAUTHORIZED);
			}
			List<UUID> ids = groupMemberRepository.findActiveGroupIdsForUser(viewerId);
			groups = ids.isEmpty() ? List.of() : groupRepository.findActiveByIds(ids);
		} else {
			List<UUID> secretVisible = viewerId == null
					? List.of()
					: groupMemberRepository.findGroupIdsVisibleToUser(viewerId);
			// JPQL IN empty list is problematic — use dummy UUID never matching
			if (secretVisible.isEmpty()) {
				secretVisible = List.of(UUID.fromString("00000000-0000-0000-0000-000000000000"));
			}
			groups = groupRepository.searchVisible(search, secretVisible);
		}
		return ApiResponse.ok(toResponses(groups, viewerId));
	}

	@Transactional(readOnly = true)
	public GroupResponse get(UUID id, UUID viewerId) {
		GroupEntity group = requireActive(id);
		permissions.requireView(group, viewerId);
		return toResponses(List.of(group), viewerId).getFirst();
	}

	@Transactional
	public GroupResponse create(UUID creatorId, JsonNode body) {
		writeRateLimit.checkCreateGroup(creatorId);
		User creator = userRepository.findById(creatorId)
				.orElseThrow(() -> new AppException("unauthorized", "Authentication required", HttpStatus.UNAUTHORIZED));

		if (!creator.isSiteAdmin() && !institutionAuthorityChecker.isReferentOfAny(creatorId)) {
			throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		}

		String name = text(body, "name");
		String description = body.has("description") ? text(body, "description") : "";
		String visibility = body.has("visibility") ? text(body, "visibility") : "public";
		if (name.length() < 2 || name.length() > 120) {
			throw validation("name", "Le nom doit contenir entre 2 et 120 caractères.");
		}
		if (!Set.of("public", "private", "secret").contains(visibility)) {
			throw validation("visibility", "Visibilité invalide.");
		}

		GroupEntity group = new GroupEntity();
		group.setName(name);
		group.setSlug(uniqueSlug(name));
		group.setDescription(description);
		group.setVisibility(visibility);
		group.setCreatedBy(creator);
		group.setMembersCount(1);
		groupRepository.save(group);

		GroupMember admin = new GroupMember();
		admin.setGroup(group);
		admin.setUser(creator);
		admin.setStatus("active");
		admin.setRole("admin");
		groupMemberRepository.save(admin);
		events.publishEvent(VisibleDataChanged.groups());

		return toResponses(List.of(group), creatorId).getFirst();
	}

	@Transactional
	public GroupResponse patch(UUID groupId, UUID actorId, JsonNode body) {
		GroupEntity group = requireActive(groupId);
		permissions.requireAdmin(group, actorId);
		if (body.has("name")) {
			String name = text(body, "name");
			if (name.length() < 2 || name.length() > 120) {
				throw validation("name", "Le nom doit contenir entre 2 et 120 caractères.");
			}
			group.setName(name);
		}
		if (body.has("description")) {
			group.setDescription(text(body, "description"));
		}
		if (body.has("visibility")) {
			String visibility = text(body, "visibility");
			if (!Set.of("public", "private", "secret").contains(visibility)) {
				throw validation("visibility", "Visibilité invalide.");
			}
			group.setVisibility(visibility);
		}
		events.publishEvent(VisibleDataChanged.groups());
		return toResponses(List.of(group), actorId).getFirst();
	}

	@Transactional
	public void delete(UUID groupId, UUID actorId) {
		GroupEntity group = requireActive(groupId);
		permissions.requireAdmin(group, actorId);
		Instant now = Instant.now();
		group.setDeletedAt(now);
		postRepository.softDeleteByGroup(groupId, now);
		events.publishEvent(new GroupDeletedEvent(groupId));
	}

	@Transactional
	public Map<String, String> join(UUID groupId, UUID userId) {
		GroupEntity group = requireActive(groupId);
		Optional<GroupMember> existing = groupMemberRepository.findByGroupIdAndUserId(groupId, userId);
		if (existing.isPresent()) {
			GroupMember m = existing.get();
			if ("banned".equals(m.getStatus())) {
				throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
			}
			if ("active".equals(m.getStatus()) || "pending".equals(m.getStatus()) || "invited".equals(m.getStatus())) {
				return Map.of("status", m.getStatus());
			}
		}

		return switch (group.getVisibility()) {
			case "public" -> {
				upsertMember(group, userId, "active", "member", existing.orElse(null));
				groupRepository.bumpMembers(groupId, 1);
				events.publishEvent(VisibleDataChanged.groups());
				yield Map.of("status", "active");
			}
			case "private" -> {
				upsertMember(group, userId, "pending", "member", existing.orElse(null));
				events.publishEvent(new GroupJoinRequestEvent(groupId, userId));
				events.publishEvent(VisibleDataChanged.groups());
				yield Map.of("status", "pending");
			}
			case "secret" -> throw new AppException(
					"invite_only",
					"Ce groupe est accessible uniquement sur invitation.",
					HttpStatus.FORBIDDEN);
			default -> throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		};
	}

	@Transactional
	public void leave(UUID groupId, UUID userId) {
		GroupEntity group = requireActive(groupId);
		if (permissions.isCreator(group, userId)) {
			throw new AppException(
					"group_owner_cannot_leave",
					"L’auteur du groupe ne peut pas le quitter.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
				.orElseThrow(() -> new AppException("not_found", "Adhésion introuvable.", HttpStatus.NOT_FOUND));
		if ("active".equals(member.getStatus()) && "admin".equals(member.getRole())) {
			ensureNotLastAdmin(groupId);
		}
		boolean wasActive = "active".equals(member.getStatus());
		groupMemberRepository.delete(member);
		if (wasActive) {
			groupRepository.adjustMembers(groupId, -1);
		}
		events.publishEvent(VisibleDataChanged.groups());
	}

	@Transactional
	public Map<String, String> invite(UUID groupId, UUID actorId, UUID inviteeId) {
		GroupEntity group = requireActive(groupId);
		if (!permissions.canInvite(group, actorId)) {
			throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		}
		User invitee = userRepository.findById(inviteeId)
				.filter(u -> !u.isAccountDeactivated() && !u.isAccountDeleted())
				.orElseThrow(() -> new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));

		Optional<GroupMember> existing = groupMemberRepository.findByGroupIdAndUserId(groupId, inviteeId);
		if (existing.isPresent() && "active".equals(existing.get().getStatus())) {
			return Map.of("status", "active");
		}
		GroupMember member = existing.orElseGet(GroupMember::new);
		member.setGroup(group);
		member.setUser(invitee);
		member.setStatus("invited");
		member.setRole("member");
		groupMemberRepository.save(member);
		events.publishEvent(new GroupInvitationEvent(inviteeId, groupId, actorId));
		events.publishEvent(VisibleDataChanged.groups());
		return Map.of("status", "invited");
	}

	@Transactional
	public Map<String, String> respondInvitation(UUID groupId, UUID userId, boolean accept) {
		GroupEntity group = requireActive(groupId);
		GroupMember member = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
				.orElseThrow(() -> new AppException("not_found", "Invitation introuvable.", HttpStatus.NOT_FOUND));
		if (!"invited".equals(member.getStatus())) {
			throw new AppException("validation_failed", "Pas d’invitation en attente.", HttpStatus.UNPROCESSABLE_ENTITY);
		}
		if (!accept) {
			groupMemberRepository.delete(member);
			events.publishEvent(VisibleDataChanged.groups());
			return Map.of("status", "none");
		}
		member.setStatus("active");
		member.setRole("member");
		groupRepository.bumpMembers(groupId, 1);
		events.publishEvent(VisibleDataChanged.groups());
		return Map.of("status", "active");
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<GroupMemberResponse>> listMembers(UUID groupId, String status, UUID viewerId) {
		GroupEntity group = requireActive(groupId);
		permissions.requireView(group, viewerId);
		if (!permissions.canListMembers(group, viewerId)) {
			throw new AppException("not_found", "Membres introuvables.", HttpStatus.NOT_FOUND);
		}
		List<GroupMember> members = groupMemberRepository.findByGroupAndOptionalStatus(
				groupId, status == null || status.isBlank() ? null : status);
		UUID creatorId = group.getCreatedBy() != null ? group.getCreatedBy().getId() : null;
		List<GroupMemberResponse> data = members.stream()
				.map(m -> toMemberResponse(m, creatorId))
				.toList();
		return ApiResponse.ok(data);
	}

	@Transactional
	public Map<String, String> approve(UUID groupId, UUID actorId, UUID targetUserId) {
		return resolvePending(groupId, actorId, targetUserId, true);
	}

	@Transactional
	public Map<String, String> reject(UUID groupId, UUID actorId, UUID targetUserId) {
		return resolvePending(groupId, actorId, targetUserId, false);
	}

	@Transactional
	public void exclude(UUID groupId, UUID actorId, UUID targetUserId) {
		GroupEntity group = requireActive(groupId);
		permissions.requireManage(group, actorId);
		GroupMember target = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
				.orElseThrow(() -> new AppException("not_found", "Membre introuvable.", HttpStatus.NOT_FOUND));
		if (permissions.isCreator(group, targetUserId)) {
			throw new AppException(
					"group_owner_cannot_leave",
					"L’auteur du groupe ne peut pas être exclu.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}

		GroupMember actor = groupMemberRepository.findByGroupIdAndUserId(groupId, actorId).orElse(null);
		boolean actorIsAdmin = permissions.isSiteAdmin(actorId)
				|| (actor != null && "admin".equals(actor.getRole()) && "active".equals(actor.getStatus()));
		if ("admin".equals(target.getRole()) && !actorIsAdmin) {
			throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		}
		if ("active".equals(target.getStatus()) && "admin".equals(target.getRole())) {
			ensureNotLastAdmin(groupId);
		}
		boolean wasActive = "active".equals(target.getStatus());
		target.setStatus("banned");
		target.setRole("member");
		if (wasActive) {
			groupRepository.adjustMembers(groupId, -1);
		}
		events.publishEvent(VisibleDataChanged.groups());
	}

	@Transactional
	public Map<String, String> changeRole(UUID groupId, UUID actorId, UUID targetUserId, String role) {
		GroupEntity group = requireActive(groupId);
		permissions.requireAdmin(group, actorId);
		if (!Set.of("member", "moderator", "admin").contains(role)) {
			throw validation("role", "Rôle invalide.");
		}
		GroupMember target = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
				.filter(m -> "active".equals(m.getStatus()))
				.orElseThrow(() -> new AppException("not_found", "Membre introuvable.", HttpStatus.NOT_FOUND));
		if (permissions.isCreator(group, targetUserId) && !"admin".equals(role)) {
			throw new AppException(
					"group_owner_cannot_leave",
					"L’auteur du groupe doit rester administrateur.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		if ("admin".equals(target.getRole()) && !"admin".equals(role)) {
			ensureNotLastAdmin(groupId);
		}
		target.setRole(role);
		events.publishEvent(VisibleDataChanged.groups());
		return Map.of("role", role);
	}

	private Map<String, String> resolvePending(UUID groupId, UUID actorId, UUID targetUserId, boolean approve) {
		GroupEntity group = requireActive(groupId);
		permissions.requireManage(group, actorId);
		GroupMember target = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
				.orElseThrow(() -> new AppException("not_found", "Demande introuvable.", HttpStatus.NOT_FOUND));
		if (!"pending".equals(target.getStatus())) {
			throw new AppException("validation_failed", "Pas de demande en attente.", HttpStatus.UNPROCESSABLE_ENTITY);
		}
		if (approve) {
			target.setStatus("active");
			target.setRole("member");
			groupRepository.bumpMembers(groupId, 1);
		} else {
			groupMemberRepository.delete(target);
		}
		events.publishEvent(new GroupRequestResolvedEvent(targetUserId, groupId, approve));
		events.publishEvent(VisibleDataChanged.groups());
		return Map.of("status", approve ? "active" : "rejected");
	}

	private void upsertMember(GroupEntity group, UUID userId, String status, String role, GroupMember existing) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new AppException("unauthorized", "Authentication required", HttpStatus.UNAUTHORIZED));
		GroupMember member = existing != null ? existing : new GroupMember();
		member.setGroup(group);
		member.setUser(user);
		member.setStatus(status);
		member.setRole(role);
		groupMemberRepository.save(member);
	}

	private void ensureNotLastAdmin(UUID groupId) {
		if (groupMemberRepository.countActiveAdmins(groupId) <= 1) {
			throw new AppException(
					"last_admin",
					"Impossible de retirer le dernier administrateur.",
					HttpStatus.CONFLICT);
		}
	}

	@Transactional(readOnly = true)
	public List<GroupResponse> listMyInvitations(UUID userId) {
		List<GroupEntity> groups = groupMemberRepository.findPendingInvitationsWithGroup(userId).stream()
				.map(GroupMember::getGroup)
				.toList();
		return toResponses(groups, userId);
	}

	private List<GroupResponse> listForUser(UUID userId, UUID viewerId) {
		List<GroupEntity> groups = groupMemberRepository.findActiveMembershipsWithGroup(userId).stream()
				.map(GroupMember::getGroup)
				.filter(g -> permissions.canView(g, viewerId))
				.toList();
		return toResponses(groups, viewerId);
	}

	private GroupEntity requireActive(UUID id) {
		return groupRepository.findActiveById(id)
				.orElseThrow(() -> new AppException("not_found", "Groupe introuvable.", HttpStatus.NOT_FOUND));
	}

	private List<GroupResponse> toResponses(List<GroupEntity> groups, UUID viewerId) {
		if (groups.isEmpty()) {
			return List.of();
		}
		Map<UUID, GroupMember> memberships = new HashMap<>();
		if (viewerId != null) {
			List<UUID> ids = groups.stream().map(GroupEntity::getId).toList();
			for (GroupMember m : groupMemberRepository.findViewerMemberships(viewerId, ids)) {
				memberships.put(m.getGroup().getId(), m);
			}
		}
		return groups.stream().map(g -> {
			GroupMember m = memberships.get(g.getId());
			String status = m == null ? "none" : m.getStatus();
			String role = m == null || "none".equals(status) ? null : m.getRole();
			if (m != null && "banned".equals(m.getStatus())) {
				status = "banned";
				role = null;
			}
			return new GroupResponse(
					g.getId().toString(),
					g.getName(),
					g.getSlug(),
					g.getDescription(),
					g.getCoverUrl(),
					g.getVisibility(),
					g.getMembersCount(),
					g.getCreatedAt().toString(),
					status,
					role,
					permissions.isCreator(g, viewerId));
		}).toList();
	}

	private GroupMemberResponse toMemberResponse(GroupMember m, UUID creatorId) {
		User u = m.getUser();
		boolean isCreator = creatorId != null && creatorId.equals(u.getId());
		return new GroupMemberResponse(
				u.getId().toString(),
				u.getDisplayName(),
				userTransformer.resolveAvatarUrl(u),
				u.getProfession() == null ? "" : u.getProfession(),
				m.getStatus(),
				m.getRole(),
				isCreator);
	}

	private String uniqueSlug(String name) {
		String base = name.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("^-+|-+$", "");
		if (base.isBlank()) {
			base = "group";
		}
		String slug = base;
		int i = 1;
		while (groupRepository.existsBySlug(slug)) {
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
}
