package com.afrea.yee.groups.dto;

public record GroupMemberResponse(
		String id,
		String displayName,
		String avatarUrl,
		String profession,
		String status,
		String role,
		boolean isCreator
) {
}
