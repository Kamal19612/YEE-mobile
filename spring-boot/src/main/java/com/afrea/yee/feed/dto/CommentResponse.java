package com.afrea.yee.feed.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record CommentResponse(
		String id,
		String postId,
		PostResponse.AuthorResponse author,
		String content,
		String createdAt,
		@JsonProperty("isOwnComment") boolean isOwnComment,
		String parentId,
		String replyToName,
		List<CommentResponse> replies
) {
}
