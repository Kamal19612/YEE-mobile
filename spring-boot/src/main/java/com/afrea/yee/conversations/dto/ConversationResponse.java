package com.afrea.yee.conversations.dto;

import java.util.List;

public record ConversationResponse(
		String id,
		String type,
		String subject,
		String groupId,
		String groupName,
		boolean isGroup,
		List<ConversationParticipantResponse> participants,
		MessageResponse lastMessage,
		boolean unread,
		long unreadCount,
		String updatedAt,
		List<MessageResponse> messages) {
}
