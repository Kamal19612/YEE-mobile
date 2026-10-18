package com.afrea.yee.conversations;

import java.util.List;
import java.util.UUID;

public record MessageDeletedEvent(
		UUID conversationId,
		Long messageId,
		UUID deletedBy,
		List<UUID> participantIds) {
}
