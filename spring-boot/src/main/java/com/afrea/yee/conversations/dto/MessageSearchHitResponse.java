package com.afrea.yee.conversations.dto;

public record MessageSearchHitResponse(
		String conversationId,
		String conversationSubject,
		boolean isGroup,
		MessageResponse message) {
}
