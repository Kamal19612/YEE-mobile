package com.afrea.yee.resources.dto;

public record CategoryResponse(
		String id,
		String slug,
		String name,
		int sortOrder,
		long resourceCount
) {
}
