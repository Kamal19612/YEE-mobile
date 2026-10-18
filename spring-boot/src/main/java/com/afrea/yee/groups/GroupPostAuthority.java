package com.afrea.yee.groups;

import java.util.UUID;

/**
 * Point d'extension Couche 4 (GroupPermissions::can_post).
 */
public interface GroupPostAuthority {
	boolean canPost(UUID userId, UUID groupId);
}
