package com.afrea.yee.users;

import java.util.UUID;

public record UserFollowedEvent(UUID followeeId, UUID followerId) {
}
