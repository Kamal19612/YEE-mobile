package com.afrea.yee.feed;

import java.util.UUID;

public record PostCommentedEvent(UUID recipientId, UUID actorId, Long postId, Long commentId) {
}
