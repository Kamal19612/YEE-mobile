package com.afrea.yee.conversations.dto;

import java.util.List;

public record ConversationSearchResponse(
		List<ConversationResponse> conversations,
		List<MessageSearchHitResponse> messages) {
}
