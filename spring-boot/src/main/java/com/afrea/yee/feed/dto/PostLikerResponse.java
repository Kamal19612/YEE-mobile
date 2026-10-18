package com.afrea.yee.feed.dto;

public record PostLikerResponse(
		String id,
		String displayName,
		String avatarUrl,
		String profession,
		String likedAt
) {
}
