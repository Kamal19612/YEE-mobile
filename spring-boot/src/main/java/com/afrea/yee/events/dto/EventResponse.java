package com.afrea.yee.events.dto;

import java.util.List;

/**
 * Contrat public d’un événement.
 * {@code temporalStatus} est calculé : {@code upcoming} ou {@code past}.
 */
public record EventResponse(
		String id,
		String title,
		String slug,
		String categoryId,
		String categorySlug,
		String categoryName,
		String description,
		String startsAt,
		String endsAt,
		String temporalStatus,
		String locationType,
		String joinUrl,
		String venueAddress,
		String coverType,
		String coverUrl,
		String videoUrl,
		String videoProvider,
		String videoExternalId,
		String videoEmbedUrl,
		EventReportResponse report,
		List<EventVisualResponse> visuals,
		String status,
		String createdAt,
		String updatedAt,
		String createdByName
) {
}
