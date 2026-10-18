package com.afrea.yee.feed;

import java.util.UUID;

public record PostLikedEvent(UUID recipientId, UUID actorId, Long postId) {
}
