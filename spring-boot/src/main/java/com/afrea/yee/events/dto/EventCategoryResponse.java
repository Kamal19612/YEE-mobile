package com.afrea.yee.events.dto;

public record EventCategoryResponse(
		String id,
		String slug,
		String name,
		int sortOrder,
		long eventCount
) {
}
