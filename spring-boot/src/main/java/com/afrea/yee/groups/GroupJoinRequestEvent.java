package com.afrea.yee.groups;

import java.util.UUID;

public record GroupJoinRequestEvent(UUID groupId, UUID requesterId) {
}
