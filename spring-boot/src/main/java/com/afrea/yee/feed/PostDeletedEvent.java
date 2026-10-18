package com.afrea.yee.feed;

import java.util.UUID;

public record PostDeletedEvent(Long postId, UUID authorId, UUID groupId) {
}
