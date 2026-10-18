package com.afrea.yee.groups;

import java.util.UUID;

public record GroupInvitationEvent(UUID inviteeId, UUID groupId, UUID actorId) {
}
