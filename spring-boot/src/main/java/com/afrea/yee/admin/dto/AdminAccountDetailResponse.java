package com.afrea.yee.admin.dto;

import java.util.List;
import java.util.Map;

public record AdminAccountDetailResponse(
		String id,
		String displayName,
		String mentionName,
		String email,
		String bio,
		String profession,
		String organization,
		String location,
		Map<String, String> socialLinks,
		String avatarUrl,
		String coverUrl,
		boolean emailVerified,
		boolean accountDeactivated,
		boolean accountDeleted,
		boolean siteAdmin,
		boolean twoFactorEnabled,
		int postsCount,
		int followersCount,
		int followingCount,
		String createdAt,
		String updatedAt,
		String deactivatedAt,
		List<AdminSessionResponse> activeSessions) {
}
