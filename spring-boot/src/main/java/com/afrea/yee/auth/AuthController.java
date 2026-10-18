package com.afrea.yee.auth;

import com.afrea.yee.auth.dto.ForgotPasswordRequest;
import com.afrea.yee.auth.dto.LoginRequest;
import com.afrea.yee.auth.dto.RegisterRequest;
import com.afrea.yee.auth.dto.ResetPasswordRequest;
import com.afrea.yee.auth.dto.SessionResponse;
import com.afrea.yee.auth.dto.TokenRequest;
import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.config.AppProperties;
import com.afrea.yee.common.exception.AppException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

	private final AuthService authService;
	private final RefreshCookieService refreshCookieService;
	private final AppProperties appProperties;
	private final RateLimiter rateLimiter;

	public AuthController(
			AuthService authService,
			RefreshCookieService refreshCookieService,
			AppProperties appProperties,
			RateLimiter rateLimiter) {
		this.authService = authService;
		this.refreshCookieService = refreshCookieService;
		this.appProperties = appProperties;
		this.rateLimiter = rateLimiter;
	}

	@PostMapping("/register")
	public ResponseEntity<ApiResponse<Map<String, Object>>> register(
			@Valid @RequestBody RegisterRequest body,
			HttpServletRequest request) {
		AuthService.RegisterOutcome outcome = authService.register(body, rateLimiter.clientIp(request));
		if (!outcome.created()) {
			java.util.LinkedHashMap<String, Object> taken = new java.util.LinkedHashMap<>();
			taken.put(
					"message",
					"Si cet email n’est pas déjà utilisé, un lien de vérification vient d’être envoyé.");
			taken.put("retryAfterSeconds", 0);
			return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok(taken));
		}
		java.util.LinkedHashMap<String, Object> data = new java.util.LinkedHashMap<>();
		data.put("message", "Compte créé. Vérifiez votre boîte mail pour l’activer.");
		data.put("retryAfterSeconds", AuthService.VERIFICATION_RESEND_COOLDOWN_SECONDS);
		// Uniquement en profil dev (app.dev.expose-email-links). En prod le lien
		// ne sort pas dans le JSON : il est destiné au transporteur d'e-mail.
		if (appProperties.getDev().isExposeEmailLinks()
				&& outcome.verificationUrl() != null
				&& !outcome.verificationUrl().isBlank()) {
			data.put("verificationUrl", outcome.verificationUrl());
		}
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(data));
	}

	@PostMapping("/resend-verification")
	public ResponseEntity<ApiResponse<Map<String, Object>>> resendVerification(
			@Valid @RequestBody ForgotPasswordRequest body,
			HttpServletRequest request) {
		AuthService.ResendOutcome outcome = authService.resendVerification(body, rateLimiter.clientIp(request));
		java.util.LinkedHashMap<String, Object> data = new java.util.LinkedHashMap<>();
		data.put(
				"message",
				"Si un compte est en attente de confirmation pour cet e-mail, un nouveau lien vient d’être envoyé.");
		data.put("retryAfterSeconds", outcome.retryAfterSeconds());
		if (appProperties.getDev().isExposeEmailLinks()
				&& outcome.verificationUrl() != null
				&& !outcome.verificationUrl().isBlank()) {
			data.put("verificationUrl", outcome.verificationUrl());
		}
		return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.ok(data));
	}

	@PostMapping("/verify-email")
	public ResponseEntity<ApiResponse<Map<String, String>>> verifyEmail(
			@Valid @RequestBody TokenRequest body) {
		authService.verifyEmail(body);
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Email vérifié avec succès.")));
	}

	@PostMapping("/login")
	public ResponseEntity<ApiResponse<SessionResponse>> login(
			@Valid @RequestBody LoginRequest body,
			HttpServletRequest request,
			HttpServletResponse response) {
		AuthService.IssuedSession session = authService.login(
				body,
				rateLimiter.clientIp(request),
				request.getHeader("User-Agent"));
		refreshCookieService.setRefreshCookie(response, session.refreshTokenRaw());
		return ResponseEntity.ok(ApiResponse.ok(session.body()));
	}

	@PostMapping("/refresh")
	public ResponseEntity<ApiResponse<SessionResponse>> refresh(
			HttpServletRequest request,
			HttpServletResponse response) {
		assertOriginAllowed(request);
		try {
			AuthService.IssuedSession session = authService.refresh(
					refreshCookieService.readRefreshCookie(request),
					rateLimiter.clientIp(request),
					request.getHeader("User-Agent"));
			refreshCookieService.setRefreshCookie(response, session.refreshTokenRaw());
			return ResponseEntity.ok(ApiResponse.ok(session.body()));
		} catch (AppException ex) {
			refreshCookieService.clearRefreshCookie(response);
			throw ex;
		}
	}

	@PostMapping("/logout")
	public ResponseEntity<ApiResponse<Map<String, String>>> logout(
			HttpServletRequest request,
			HttpServletResponse response) {
		authService.logout(refreshCookieService.readRefreshCookie(request));
		refreshCookieService.clearRefreshCookie(response);
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Déconnecté.")));
	}

	@PostMapping("/forgot-password")
	public ResponseEntity<ApiResponse<Map<String, String>>> forgotPassword(
			@Valid @RequestBody ForgotPasswordRequest body,
			HttpServletRequest request) {
		authService.forgotPassword(body, rateLimiter.clientIp(request));
		return ResponseEntity.status(HttpStatus.ACCEPTED)
				.body(ApiResponse.ok(Map.of(
						"message",
						"Si cet email est associé à un compte, un lien de réinitialisation vient d’être envoyé.")));
	}

	@PostMapping("/reset-password")
	public ResponseEntity<ApiResponse<Map<String, String>>> resetPassword(
			@Valid @RequestBody ResetPasswordRequest body) {
		authService.resetPassword(body);
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Mot de passe réinitialisé avec succès.")));
	}

	@GetMapping("/me")
	public ResponseEntity<ApiResponse<?>> me(@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(ApiResponse.ok(authService.me(principal.getId())));
	}

	/** Le cookie seul ne suffit pas : l'origine doit être dans APP_ALLOWED_ORIGINS. */
	private void assertOriginAllowed(HttpServletRequest request) {
		String origin = request.getHeader("Origin");
		if (!appProperties.isOriginAllowed(origin)) {
			throw new AppException(
					"origin_not_allowed",
					"Origine non autorisée.",
					HttpStatus.FORBIDDEN);
		}
	}
}
