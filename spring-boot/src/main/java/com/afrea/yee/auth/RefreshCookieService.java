package com.afrea.yee.auth;

import com.afrea.yee.common.ApiPaths;
import com.afrea.yee.common.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshCookieService {

	public static final String COOKIE_NAME = "app_refresh_token";
	/** Aligné sur POST /api/auth/refresh (préfixe API). */
	public static final String COOKIE_PATH = ApiPaths.ROOT + "/auth";
	/** Ancien Path avant le préfixe /api — nettoyé au login/logout. */
	public static final String LEGACY_COOKIE_PATH = "/auth";

	private final AppProperties appProperties;

	public RefreshCookieService(AppProperties appProperties) {
		this.appProperties = appProperties;
	}

	public void setRefreshCookie(HttpServletResponse response, String rawToken) {
		clearLegacyRefreshCookie(response);
		ResponseCookie cookie = baseBuilder(rawToken, COOKIE_PATH)
				.maxAge(Duration.ofDays(RefreshTokenService.SLIDING_TTL_DAYS))
				.build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

	public void clearRefreshCookie(HttpServletResponse response) {
		clearLegacyRefreshCookie(response);
		ResponseCookie cookie = baseBuilder("", COOKIE_PATH)
				.maxAge(Duration.ZERO)
				.build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

	public String readRefreshCookie(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		for (Cookie cookie : cookies) {
			if (COOKIE_NAME.equals(cookie.getName())) {
				return cookie.getValue();
			}
		}
		return null;
	}

	private void clearLegacyRefreshCookie(HttpServletResponse response) {
		ResponseCookie legacy = baseBuilder("", LEGACY_COOKIE_PATH)
				.maxAge(Duration.ZERO)
				.build();
		response.addHeader(HttpHeaders.SET_COOKIE, legacy.toString());
	}

	private ResponseCookie.ResponseCookieBuilder baseBuilder(String value, String path) {
		return ResponseCookie.from(COOKIE_NAME, value)
				.httpOnly(true)
				.secure(appProperties.getCookie().isSecure())
				.path(path)
				.sameSite(appProperties.getCookie().getSameSite());
	}
}
