package com.afrea.yee.events.dto;

/** Rapport PDF unique rattaché à un événement. */
public record EventReportResponse(
		String id,
		String title,
		String originalFilename,
		String mimeType,
		long byteSize,
		String fileUrl
) {
}
