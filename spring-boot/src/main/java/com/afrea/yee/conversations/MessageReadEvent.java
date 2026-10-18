package com.afrea.yee.conversations;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MessageReadEvent(
		UUID conversationId,
		UUID readerId,
		Instant lastReadAt,
		List<UUID> otherParticipantIds) {
}
