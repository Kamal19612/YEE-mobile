package com.afrea.yee.groups;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.entity.GroupMember;
import com.afrea.yee.groups.repository.GroupMemberRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Seule source de vérité pour les droits groupes (équivalent PHP GroupPermissions).
 */
@Component
public class GroupPermissions {

	private final GroupMemberRepository groupMemberRepository;
	private final UserRepository userRepository;

	public GroupPermissions(GroupMemberRepository groupMemberRepository, UserRepository userRepository) {
		this.groupMemberRepository = groupMemberRepository;
		this.userRepository = userRepository;
	}

	public boolean isSiteAdmin(UUID userId) {
		if (userId == null) {
			return false;
		}
		return userRepository.findById(userId).map(User::isSiteAdmin).orElse(false);
	}

	public Optional<GroupMember> membership(UUID groupId, UUID userId) {
		if (userId == null) {
			return Optional.empty();
		}
		return groupMemberRepository.findByGroupIdAndUserId(groupId, userId);
	}

	public boolean canView(GroupEntity group, UUID viewerId) {
		if (isSiteAdmin(viewerId)) {
			return true;
		}
		if (!"secret".equals(group.getVisibility())) {
			return true;
		}
		// Invité : il doit voir la fiche pour accepter. Exclu et en attente : non.
		return membership(group.getId(), viewerId)
				.filter(m -> "active".equals(m.getStatus()) || "invited".equals(m.getStatus()))
				.isPresent();
	}

	/**
	 * Liste des membres. Un groupe public la montre à qui peut voir la fiche.
	 * private et secret : membre actif, ou administrateur du site.
	 */
	public boolean canListMembers(GroupEntity group, UUID viewerId) {
		if (isSiteAdmin(viewerId)) {
			return true;
		}
		if ("public".equals(group.getVisibility())) {
			return true;
		}
		return membership(group.getId(), viewerId)
				.filter(m -> "active".equals(m.getStatus()))
				.isPresent();
	}

	public boolean canPost(UUID groupId, UUID userId) {
		if (isSiteAdmin(userId)) {
			return true;
		}
		return membership(groupId, userId)
				.filter(m -> "active".equals(m.getStatus()))
				.isPresent();
	}

	public boolean canManageMembership(GroupEntity group, UUID actorId) {
		if (isSiteAdmin(actorId)) {
			return true;
		}
		return membership(group.getId(), actorId)
				.filter(m -> "active".equals(m.getStatus()))
				.filter(m -> "admin".equals(m.getRole()) || "moderator".equals(m.getRole()))
				.isPresent();
	}

	public boolean canChangeRoles(GroupEntity group, UUID actorId) {
		if (isSiteAdmin(actorId)) {
			return true;
		}
		return membership(group.getId(), actorId)
				.filter(m -> "active".equals(m.getStatus()))
				.filter(m -> "admin".equals(m.getRole()))
				.isPresent();
	}

	public boolean canDelete(GroupEntity group, UUID actorId) {
		return canChangeRoles(group, actorId);
	}

	public boolean isCreator(GroupEntity group, UUID userId) {
		if (userId == null || group == null || group.getCreatedBy() == null) {
			return false;
		}
		return userId.equals(group.getCreatedBy().getId());
	}

	public boolean canInvite(GroupEntity group, UUID actorId) {
		return canManageMembership(group, actorId);
	}

	public void requireView(GroupEntity group, UUID viewerId) {
		if (!canView(group, viewerId)) {
			throw new AppException("not_found", "Groupe introuvable.", HttpStatus.NOT_FOUND);
		}
	}

	public void requireManage(GroupEntity group, UUID actorId) {
		if (!canManageMembership(group, actorId)) {
			throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		}
	}

	public void requireAdmin(GroupEntity group, UUID actorId) {
		if (!canChangeRoles(group, actorId)) {
			throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		}
	}
}
