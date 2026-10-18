package com.afrea.yee.admin.dto;

public record AdminSessionResponse(
		long id,
		String ipAddress,
		String userAgent,
		boolean rememberMe,
		String createdAt,
		String expiresAt) {
}
