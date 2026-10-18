package com.afrea.yee.conversations;

import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.conversations.entity.Conversation;
import com.afrea.yee.conversations.repository.ConversationParticipantRepository;
import com.afrea.yee.conversations.repository.ConversationRepository;
import com.afrea.yee.notifications.NotificationRealtimeHub;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConversationRealtimeService {

	private final ConversationRepository conversationRepository;
	private final ConversationParticipantRepository participantRepository;
	private final ConversationPermissions permissions;
	private final ConversationService conversationService;
	private final NotificationRealtimeHub realtimeHub;
	private final WriteRateLimit writeRateLimit;

	public ConversationRealtimeService(
			ConversationRepository conversationRepository,
			ConversationParticipantRepository participantRepository,
			ConversationPermissions permissions,
			ConversationService conversationService,
			NotificationRealtimeHub realtimeHub,
			WriteRateLimit writeRateLimit) {
		this.conversationRepository = conversationRepository;
		this.participantRepository = participantRepository;
		this.permissions = permissions;
		this.conversationService = conversationService;
		this.realtimeHub = realtimeHub;
		this.writeRateLimit = writeRateLimit;
	}

	@Transactional(readOnly = true)
	public void publishTyping(UUID userId, UUID conversationId) {
		writeRateLimit.checkTyping(userId);
		Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
		if (conversation == null) {
			return;
		}
		permissions.requireAccess(conversation, userId);
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("type", "message.typing");
		payload.put("conversationId", conversationId.toString());
		payload.put("userId", userId.toString());
		for (UUID recipientId : participantRepository.findUserIdsByConversationId(conversationId)) {
			if (recipientId.equals(userId)) {
				continue;
			}
			realtimeHub.publishTo(recipientId, "message", payload);
		}
	}

	public long unreadThreads(UUID userId) {
		return conversationService.unreadCount(userId).getOrDefault("count", 0L);
	}
}
