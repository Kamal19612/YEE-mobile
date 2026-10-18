package com.afrea.yee.users.dto;

public record UserListItemResponse(
		String id,
		String displayName,
		String mentionName,
		String avatarUrl,
		String profession,
		String organization,
		String location,
		boolean isFollowing
) {
}
