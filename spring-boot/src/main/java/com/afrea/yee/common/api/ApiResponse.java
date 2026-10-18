package com.afrea.yee.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/**
 * Contrat JSON unique, aligné sur le plugin PHP app-api :
 * succès → { success, data, meta? } ; erreur → { success:false, error:{ code, message, details? } }.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(boolean success, T data, Map<String, Object> meta, ApiError error) {

	public static <T> ApiResponse<T> ok(T data) {
		return new ApiResponse<>(true, data, null, null);
	}

	public static <T> ApiResponse<T> ok(T data, Map<String, Object> meta) {
		return new ApiResponse<>(true, data, meta, null);
	}

	public static <T> ApiResponse<T> fail(ApiError error) {
		return new ApiResponse<>(false, null, null, error);
	}

	public static <T> ApiResponse<T> fail(String code, String message) {
		return fail(new ApiError(code, message));
	}

	public static <T> ApiResponse<T> fail(String code, String message, Map<String, Object> details) {
		return fail(new ApiError(code, message, details));
	}
}
