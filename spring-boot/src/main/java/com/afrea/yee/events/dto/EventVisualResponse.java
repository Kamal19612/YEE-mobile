package com.afrea.yee.events.dto;

/** Image de la galerie visuelle d’un événement. */
public record EventVisualResponse(
		String id,
		String originalFilename,
		String mimeType,
		long byteSize,
		int sortOrder,
		String url
) {
}
