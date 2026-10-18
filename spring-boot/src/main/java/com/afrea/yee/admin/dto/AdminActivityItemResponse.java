package com.afrea.yee.admin.dto;

import java.util.Map;

public record AdminActivityItemResponse(
		String type,
		String id,
		String createdAt,
		String summary,
		Map<String, Object> meta) {
}
