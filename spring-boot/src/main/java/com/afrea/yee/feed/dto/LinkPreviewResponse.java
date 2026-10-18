package com.afrea.yee.feed.dto;

public record LinkPreviewResponse(
		String url,
		String type,
		String title,
		String description,
		String imageUrl,
		String siteName,
		String videoId,
		String embedUrl
) {
}
