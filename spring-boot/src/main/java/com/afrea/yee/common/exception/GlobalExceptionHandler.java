package com.afrea.yee.common.exception;

import com.afrea.yee.common.api.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(AppException.class)
	public ResponseEntity<ApiResponse<Void>> handleApp(AppException ex) {
		return ResponseEntity.status(ex.getStatus())
				.body(ApiResponse.fail(ex.getCode(), ex.getMessage(), ex.getDetails()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
		Map<String, Object> fields = ex.getBindingResult().getFieldErrors().stream()
				.collect(Collectors.toMap(
						FieldError::getField,
						fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "invalid",
						(a, b) -> a,
						LinkedHashMap::new));
		return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
				.body(ApiResponse.fail(
						"validation_failed",
						"La requête contient des données invalides.",
						Map.of("fields", fields)));
	}

	@ExceptionHandler(ConstraintViolationException.class)
	public ResponseEntity<ApiResponse<Void>> handleConstraint(ConstraintViolationException ex) {
		Map<String, Object> fields = ex.getConstraintViolations().stream()
				.collect(Collectors.toMap(
						v -> v.getPropertyPath().toString(),
						v -> v.getMessage(),
						(a, b) -> a,
						LinkedHashMap::new));
		return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
				.body(ApiResponse.fail(
						"validation_failed",
						"La requête contient des données invalides.",
						Map.of("fields", fields)));
	}

	@ExceptionHandler({
		HttpMessageNotReadableException.class,
		MissingServletRequestParameterException.class,
		MethodArgumentTypeMismatchException.class
	})
	public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception ex) {
		return ResponseEntity.badRequest()
				.body(ApiResponse.fail("bad_request", "Malformed or incomplete request"));
	}

	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ApiResponse<Void>> handleNotFound(NoResourceFoundException ex) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND)
				.body(ApiResponse.fail("not_found", "Resource not found"));
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(ApiResponse.fail("forbidden", "Access denied"));
	}

	@ExceptionHandler(AuthenticationException.class)
	public ResponseEntity<ApiResponse<Void>> handleAuth(AuthenticationException ex) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
				.body(ApiResponse.fail("unauthorized", "Authentication required"));
	}

	@ExceptionHandler(AsyncRequestNotUsableException.class)
	public ResponseEntity<Void> handleAsyncGone(AsyncRequestNotUsableException ex) {
		// Client SSE déconnecté / réponse déjà fermée — ignorer silencieusement
		return ResponseEntity.status(HttpStatus.REQUEST_TIMEOUT).build();
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<?> handleGeneric(Exception ex) {
		if (ex instanceof AsyncRequestNotUsableException
				|| ex.getCause() instanceof AsyncRequestNotUsableException) {
			return ResponseEntity.status(HttpStatus.REQUEST_TIMEOUT).build();
		}
		log.error("Unhandled exception", ex);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiResponse.fail("internal_error", "An unexpected error occurred"));
	}
}
