package com.afrea.yee.users.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PublicProfileResponse(
		String id,
		String displayName,
		String mentionName,
		String bio,
		String profession,
		String organization,
		String location,
		Map<String, String> socialLinks,
		String avatarUrl,
		String coverUrl,
		ProfileStats stats,
		String joinedAt,
		@JsonProperty("isFollowing") boolean isFollowing,
		String email,
		String whoCanMessage,
		Boolean emailPrefMessages,
		Boolean canMessage
) {
	public record ProfileStats(int followersCount, int followingCount, int postsCount) {
	}
}
