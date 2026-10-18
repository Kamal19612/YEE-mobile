package com.afrea.yee.admin.dto;

public record AdminAccountListItemResponse(
		String id,
		String displayName,
		String mentionName,
		String email,
		String avatarUrl,
		String profession,
		boolean emailVerified,
		boolean accountDeactivated,
		boolean accountDeleted,
		boolean siteAdmin,
		int postsCount,
		int followersCount,
		int followingCount,
		String createdAt,
		String deactivatedAt) {
}
