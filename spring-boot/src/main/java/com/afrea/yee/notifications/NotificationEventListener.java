package com.afrea.yee.notifications;

import com.afrea.yee.feed.CommentRepliedEvent;
import com.afrea.yee.feed.PostCommentedEvent;
import com.afrea.yee.feed.PostDeletedEvent;
import com.afrea.yee.feed.PostLikedEvent;
import com.afrea.yee.groups.GroupDeletedEvent;
import com.afrea.yee.groups.GroupInvitationEvent;
import com.afrea.yee.groups.GroupJoinRequestEvent;
import com.afrea.yee.groups.GroupRequestResolvedEvent;
import com.afrea.yee.groups.repository.GroupMemberRepository;
import com.afrea.yee.institutions.InstitutionAffiliationRequestEvent;
import com.afrea.yee.institutions.InstitutionAffiliationResolvedEvent;
import com.afrea.yee.institutions.InstitutionDeletedEvent;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.conversations.ConversationService;
import com.afrea.yee.conversations.MessageDeletedEvent;
import com.afrea.yee.conversations.MessageReadEvent;
import com.afrea.yee.conversations.MessageSentEvent;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.users.AccountDeletedEvent;
import com.afrea.yee.users.UserFollowedEvent;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Câble les triggers métier → notifications.
 * AFTER_COMMIT (sync) : la notif + push SSE partent juste après le commit,
 * sans attendre un thread pool — l’échec d’une notif n’annule jamais l’action
 * (catch dans runSafe / safeNotify).
 */
@Component
public class NotificationEventListener {

	private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

	private final NotificationService notificationService;
	private final NotificationRealtimeHub realtimeHub;
	private final WebPushService webPushService;
	private final GroupMemberRepository groupMemberRepository;
	private final InstitutionRepository institutionRepository;
	private final ConversationService conversationService;
	private final UserRepository userRepository;
	private final com.afrea.yee.users.UserTransformer userTransformer;

	public NotificationEventListener(
			NotificationService notificationService,
			NotificationRealtimeHub realtimeHub,
			WebPushService webPushService,
			GroupMemberRepository groupMemberRepository,
			InstitutionRepository institutionRepository,
			ConversationService conversationService,
			UserRepository userRepository,
			com.afrea.yee.users.UserTransformer userTransformer) {
		this.notificationService = notificationService;
		this.realtimeHub = realtimeHub;
		this.webPushService = webPushService;
		this.groupMemberRepository = groupMemberRepository;
		this.institutionRepository = institutionRepository;
		this.conversationService = conversationService;
		this.userRepository = userRepository;
		this.userTransformer = userTransformer;
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onUserFollowed(UserFollowedEvent event) {
		runSafe(() -> notificationService.safeNotify(
				event.followeeId(),
				"new_follower",
				event.followerId(),
				null,
				null));
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onGroupDeleted(GroupDeletedEvent event) {
		runSafe(() -> {
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("type", "groups.deleted");
			payload.put("groupId", event.groupId().toString());
			realtimeHub.broadcast("feed", payload);
		});
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onGroupInvitation(GroupInvitationEvent event) {
		runSafe(() -> notificationService.safeNotify(
				event.inviteeId(),
				"group_invitation",
				event.actorId(),
				"group",
				event.groupId().toString()));
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onGroupJoinRequest(GroupJoinRequestEvent event) {
		runSafe(() -> {
			List<UUID> mods = groupMemberRepository.findActiveModeratorAdminIds(event.groupId());
			for (UUID recipientId : mods) {
				notificationService.safeNotify(
						recipientId,
						"group_join_request",
						event.requesterId(),
						"group",
						event.groupId().toString());
			}
		});
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onGroupRequestResolved(GroupRequestResolvedEvent event) {
		runSafe(() -> notificationService.safeNotify(
				event.requesterId(),
				event.approved() ? "group_request_approved" : "group_request_rejected",
				null,
				"group",
				event.groupId().toString()));
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onInstitutionDeleted(InstitutionDeletedEvent event) {
		runSafe(() -> {
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("type", "institutions.deleted");
			payload.put("institutionId", event.institutionId().toString());
			realtimeHub.broadcast("feed", payload);
		});
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onInstitutionAffiliationRequest(InstitutionAffiliationRequestEvent event) {
		runSafe(() -> {
			List<UUID> referents = institutionRepository.findCascadeReferentUserIds(event.institutionId());
			for (UUID recipientId : referents) {
				notificationService.safeNotify(
						recipientId,
						"institution_affiliation_request",
						event.requesterId(),
						"institution",
						event.institutionId().toString());
			}
		});
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onInstitutionAffiliationResolved(InstitutionAffiliationResolvedEvent event) {
		runSafe(() -> notificationService.safeNotify(
				event.requesterId(),
				event.approved() ? "institution_affiliation_approved" : "institution_affiliation_rejected",
				null,
				"institution",
				event.institutionId().toString()));
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onPostLiked(PostLikedEvent event) {
		runSafe(() -> notificationService.safeNotify(
				event.recipientId(),
				"post_like",
				event.actorId(),
				"post",
				event.postId().toString()));
	}

	/** Pas une notif inbox : signal temps réel pour retirer le post chez tous les clients. */
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onPostDeleted(PostDeletedEvent event) {
		runSafe(() -> {
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("type", "feed.post_deleted");
			payload.put("postId", String.valueOf(event.postId()));
			payload.put("authorId", event.authorId().toString());
			if (event.groupId() != null) {
				payload.put("groupId", event.groupId().toString());
			}
			realtimeHub.broadcast("feed", payload);
		});
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onAccountDeleted(AccountDeletedEvent event) {
		runSafe(() -> {
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("type", "feed.account_deleted");
			payload.put("authorId", event.userId().toString());
			realtimeHub.broadcast("feed", payload);
		});
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onCommentReplied(CommentRepliedEvent event) {
		runSafe(() -> notificationService.safeNotify(
				event.recipientId(),
				"comment_reply",
				event.actorId(),
				"post",
				event.postId().toString(),
				event.commentId() == null ? null : event.commentId().toString()));
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onMessageSent(MessageSentEvent event) {
		runSafe(() -> {
			User sender = userRepository.findById(event.senderId()).orElse(null);
			String senderName = sender == null ? null : sender.getDisplayName();
			String senderAvatarUrl = sender == null ? null : userTransformer.resolveAvatarUrl(sender);
			for (UUID recipientId : event.recipientIds()) {
				long unreadThreads = conversationService.unreadCount(recipientId).getOrDefault("count", 0L);
				Map<String, Object> payload = new LinkedHashMap<>();
				payload.put("type", "message.created");
				payload.put("conversationId", event.conversationId().toString());
				payload.put("messageId", String.valueOf(event.messageId()));
				payload.put("senderId", event.senderId().toString());
				if (senderName != null && !senderName.isBlank()) {
					payload.put("senderName", senderName);
				}
				if (senderAvatarUrl != null) {
					payload.put("senderAvatarUrl", senderAvatarUrl);
				}
				payload.put("preview", event.preview() == null ? "" : event.preview());
				payload.put("content", event.content() == null ? "" : event.content());
				payload.put("hasMedia", event.hasMedia());
				if (event.createdAt() != null) {
					payload.put("createdAt", event.createdAt().toString());
				}
				payload.put("unreadCount", unreadThreads);
				if (event.groupId() != null) {
					payload.put("groupId", event.groupId().toString());
				}
				// Pas d'e-mail pour les messages : SSE + Web Push (app fermée).
				// Les mails transactionnels (vérification, reset mdp) restent dans AuthEmailService.
				realtimeHub.publishTo(recipientId, "message", payload);
				webPushService.sendMessagePushAsync(
						recipientId,
						event.conversationId().toString(),
						String.valueOf(event.messageId()),
						senderName,
						event.preview(),
						event.hasMedia());
			}
		});
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onMessageRead(MessageReadEvent event) {
		runSafe(() -> {
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("type", "message.read");
			payload.put("conversationId", event.conversationId().toString());
			payload.put("readerId", event.readerId().toString());
			payload.put("lastReadAt", event.lastReadAt() == null ? null : event.lastReadAt().toString());
			for (UUID recipientId : event.otherParticipantIds()) {
				realtimeHub.publishTo(recipientId, "message", payload);
			}
		});
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onMessageDeleted(MessageDeletedEvent event) {
		runSafe(() -> {
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("type", "message.deleted");
			payload.put("conversationId", event.conversationId().toString());
			payload.put("messageId", String.valueOf(event.messageId()));
			payload.put("deletedBy", event.deletedBy().toString());
			for (UUID participantId : event.participantIds()) {
				realtimeHub.publishTo(participantId, "message", payload);
			}
		});
	}

	/** Rafraîchit en silence les listes ouvertes. Pas de texte de publication dans le flux. */
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onVisibleDataChanged(VisibleDataChanged event) {
		if (event.area() == null || event.area().isBlank()) {
			return;
		}
		runSafe(() -> {
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("type", "sync");
			payload.put("area", event.area());
			realtimeHub.broadcast("sync", payload);
		});
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onPostCommented(PostCommentedEvent event) {
		runSafe(() -> notificationService.safeNotify(
				event.recipientId(),
				"post_comment",
				event.actorId(),
				"post",
				event.postId().toString(),
				event.commentId() == null ? null : event.commentId().toString()));
	}

	private void runSafe(Runnable action) {
		try {
			action.run();
		} catch (Exception ex) {
			log.warn("Notification listener failed: {}", ex.toString());
		}
	}
}
