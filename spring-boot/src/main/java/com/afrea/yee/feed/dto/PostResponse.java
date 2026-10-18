package com.afrea.yee.feed.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record PostResponse(
		String id,
		AuthorResponse author,
		String groupId,
		String content,
		List<MediaResponse> media,
		LinkPreviewResponse linkPreview,
		int likesCount,
		int commentsCount,
		String createdAt,
		boolean viewerHasLiked,
		@JsonProperty("isOwnPost") boolean isOwnPost
) {
	public record AuthorResponse(String id, String displayName, String avatarUrl, String profession) {
	}

	public record MediaResponse(String id, String type, String url, String filename, Long byteSize) {
	}
}
