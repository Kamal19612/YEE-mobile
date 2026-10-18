package com.afrea.yee.auth.dto;

import java.util.Map;

public record MessageResponse(String message) {

	public Map<String, String> asMap() {
		return Map.of("message", message);
	}
}
