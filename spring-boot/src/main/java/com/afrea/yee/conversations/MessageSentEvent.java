package com.afrea.yee.conversations;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MessageSentEvent(
		UUID conversationId,
		Long messageId,
		UUID senderId,
		List<UUID> recipientIds,
		String preview,
		String content,
		boolean hasMedia,
		String conversationType,
		UUID groupId,
		Instant createdAt) {
}
