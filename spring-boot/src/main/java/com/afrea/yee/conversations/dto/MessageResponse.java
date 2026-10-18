package com.afrea.yee.conversations.dto;

import java.util.List;

public record MessageResponse(
		String id,
		String conversationId,
		String senderId,
		String senderName,
		String senderAvatar,
		String content,
		List<MessageMediaResponse> media,
		String createdAt,
		boolean mine,
		boolean seen,
		int seenCount,
		boolean deleted) {
}
