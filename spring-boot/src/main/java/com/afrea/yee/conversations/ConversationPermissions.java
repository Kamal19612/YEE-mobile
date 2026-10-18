package com.afrea.yee.conversations;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.conversations.entity.Conversation;
import com.afrea.yee.conversations.repository.ConversationParticipantRepository;
import com.afrea.yee.groups.GroupPermissions;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.repository.GroupRepository;
import com.afrea.yee.users.FollowService;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class ConversationPermissions {

	public static final String EVERYONE = "everyone";
	public static final String FRIENDS = "friends";
	public static final String NOBODY = "nobody";

	private final UserRepository userRepository;
	private final FollowService followService;
	private final GroupPermissions groupPermissions;
	private final GroupRepository groupRepository;
	private final ConversationParticipantRepository participantRepository;

	public ConversationPermissions(
			UserRepository userRepository,
			FollowService followService,
			GroupPermissions groupPermissions,
			GroupRepository groupRepository,
			ConversationParticipantRepository participantRepository) {
		this.userRepository = userRepository;
		this.followService = followService;
		this.groupPermissions = groupPermissions;
		this.groupRepository = groupRepository;
		this.participantRepository = participantRepository;
	}

	public boolean isSiteAdmin(UUID userId) {
		if (userId == null) {
			return false;
		}
		return userRepository.findById(userId).map(User::isSiteAdmin).orElse(false);
	}

	public String normalizeWhoCanMessage(String raw) {
		if (raw == null || raw.isBlank()) {
			return FRIENDS;
		}
		String value = raw.trim().toLowerCase(Locale.ROOT);
		if (EVERYONE.equals(value) || FRIENDS.equals(value) || NOBODY.equals(value)) {
			return value;
		}
		return FRIENDS;
	}

	public boolean canMessage(UUID senderId, User recipient) {
		if (senderId == null || recipient == null) {
			return false;
		}
		if (senderId.equals(recipient.getId())) {
			return false;
		}
		if (recipient.isAccountDeleted() || recipient.isAccountDeactivated()) {
			return false;
		}
		if (isSiteAdmin(senderId)) {
			return true;
		}
		String policy = normalizeWhoCanMessage(recipient.getWhoCanMessage());
		if (NOBODY.equals(policy)) {
			return false;
		}
		if (EVERYONE.equals(policy)) {
			return true;
		}
		return followService.isFollowing(senderId, recipient.getId())
				&& followService.isFollowing(recipient.getId(), senderId);
	}

	public void requireCanMessage(UUID senderId, User recipient) {
		if (senderId != null && recipient != null && senderId.equals(recipient.getId())) {
			throw new AppException("validation_failed", "Vous ne pouvez pas vous écrire à vous-même.", HttpStatus.UNPROCESSABLE_ENTITY);
		}
		if (recipient == null || recipient.isAccountDeleted() || recipient.isAccountDeactivated()) {
			throw new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND);
		}
		if (!canMessage(senderId, recipient)) {
			throw new AppException(
					"forbidden",
					"Cet utilisateur n’accepte pas de messages de votre part.",
					HttpStatus.FORBIDDEN);
		}
	}

	public boolean canAccess(Conversation conversation, UUID userId) {
		if (conversation == null || userId == null) {
			return false;
		}
		if (conversation.isGroup()) {
			return canAccessGroupConversation(conversation.getGroupId(), userId);
		}
		return participantRepository.existsByConversationIdAndUserId(conversation.getId(), userId)
				|| isSiteAdmin(userId);
	}

	public boolean canAccessGroupConversation(UUID groupId, UUID userId) {
		if (groupId == null || userId == null) {
			return false;
		}
		if (isSiteAdmin(userId)) {
			return true;
		}
		return groupPermissions.canPost(groupId, userId);
	}

	public void requireAccess(Conversation conversation, UUID userId) {
		if (!canAccess(conversation, userId)) {
			throw new AppException("not_found", "Conversation introuvable.", HttpStatus.NOT_FOUND);
		}
	}

	public GroupEntity requireActiveGroup(UUID groupId, UUID userId) {
		GroupEntity group = groupRepository.findActiveById(groupId)
				.orElseThrow(() -> new AppException("not_found", "Groupe introuvable.", HttpStatus.NOT_FOUND));
		if (!canAccessGroupConversation(groupId, userId)) {
			throw new AppException("forbidden", "Vous n’êtes pas membre de ce groupe.", HttpStatus.FORBIDDEN);
		}
		return group;
	}
}
