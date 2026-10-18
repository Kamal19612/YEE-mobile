package com.afrea.yee.auth.dto;

public record SessionResponse(
		String accessToken,
		long expiresIn,
		AuthUserResponse user
) {
}
