package com.afrea.yee.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AuthUserResponse(
		String id,
		String displayName,
		String email,
		@JsonProperty("isSiteAdmin") boolean isSiteAdmin
) {
}
