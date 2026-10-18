package com.afrea.yee.groups;

import java.util.UUID;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Primary
@Component
public class ActiveMemberGroupPostAuthority implements GroupPostAuthority {

	private final GroupPermissions groupPermissions;

	public ActiveMemberGroupPostAuthority(GroupPermissions groupPermissions) {
		this.groupPermissions = groupPermissions;
	}

	@Override
	public boolean canPost(UUID userId, UUID groupId) {
		return groupPermissions.canPost(groupId, userId);
	}
}
