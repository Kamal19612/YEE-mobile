package com.afrea.yee.auth.security;

import com.afrea.yee.common.config.AppProperties;
import com.afrea.yee.common.exception.AppException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

	private final AppProperties appProperties;
	private final SecretKey key;

	public JwtService(AppProperties appProperties) {
		this.appProperties = appProperties;
		String secret = appProperties.getJwt().getSecret();
		if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
			throw new IllegalStateException(
					"APP_JWT_SECRET must be configured and at least 32 bytes (HS256).");
		}
		this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
	}

	public String issueAccessToken(UUID userId) {
		Instant now = Instant.now();
		Instant exp = now.plusSeconds(appProperties.getJwt().getAccessTtlSeconds());
		return Jwts.builder()
				.subject(userId.toString())
				.issuedAt(Date.from(now))
				.expiration(Date.from(exp))
				.issuer(appProperties.getJwt().getIssuer())
				.signWith(key)
				.compact();
	}

	public UUID parseUserId(String token) {
		Claims claims = parseClaims(token);
		try {
			return UUID.fromString(claims.getSubject());
		} catch (RuntimeException ex) {
			throw new AppException("app_auth_invalid_payload", "Payload invalide.", HttpStatus.UNAUTHORIZED);
		}
	}

	public long accessTtlSeconds() {
		return appProperties.getJwt().getAccessTtlSeconds();
	}

	private Claims parseClaims(String token) {
		try {
			return Jwts.parser()
					.verifyWith(key)
					.requireIssuer(appProperties.getJwt().getIssuer())
					.build()
					.parseSignedClaims(token)
					.getPayload();
		} catch (ExpiredJwtException ex) {
			throw new AppException("app_auth_token_expired", "Token expiré.", HttpStatus.UNAUTHORIZED);
		} catch (JwtException | IllegalArgumentException ex) {
			throw new AppException("app_auth_invalid_signature", "Signature invalide.", HttpStatus.UNAUTHORIZED);
		}
	}
}
