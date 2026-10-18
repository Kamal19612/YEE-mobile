package com.afrea.yee.feed;

import java.util.UUID;

public record CommentRepliedEvent(UUID recipientId, UUID actorId, Long postId, Long commentId) {
}
