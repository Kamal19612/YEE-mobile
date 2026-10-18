package com.afrea.yee.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(String code, String message, Map<String, Object> details) {

	public ApiError(String code, String message) {
		this(code, message, null);
	}
}
