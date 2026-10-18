package com.afrea.yee.groups;

import java.util.UUID;

public record GroupRequestResolvedEvent(UUID requesterId, UUID groupId, boolean approved) {
}
