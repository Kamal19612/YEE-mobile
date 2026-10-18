package com.afrea.yee.auth;

import com.afrea.yee.auth.entity.RefreshToken;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.RefreshTokenRepository;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

	public static final int SLIDING_TTL_DAYS = 60;

	private final RefreshTokenRepository refreshTokenRepository;
	private final UserRepository userRepository;

	public RefreshTokenService(
			RefreshTokenRepository refreshTokenRepository,
			UserRepository userRepository) {
		this.refreshTokenRepository = refreshTokenRepository;
		this.userRepository = userRepository;
	}

	@Transactional
	public String issue(UUID userId, boolean rememberMe, String userAgent, String ip, UUID familyId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new AppException("not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));

		String raw = TokenHasher.generateRawToken(48);
		RefreshToken token = new RefreshToken();
		token.setUser(user);
		token.setTokenHash(TokenHasher.sha256(raw));
		token.setFamilyId(familyId != null ? familyId : UUID.randomUUID());
		token.setUserAgent(truncate(userAgent, 255));
		token.setIpAddress(truncate(ip, 45));
		token.setRememberMe(rememberMe);
		token.setExpiresAt(Instant.now().plus(SLIDING_TTL_DAYS, ChronoUnit.DAYS));
		refreshTokenRepository.save(token);
		return raw;
	}

	/**
	 * Valide + consomme le refresh token (rotation). Ne crée pas le nouveau token.
	 * Réutilisation d'un token déjà consommé → révocation de TOUTES les sessions user.
	 */
	@Transactional
	public RotationResult rotate(String rawToken) {
		String hash = TokenHasher.sha256(rawToken);
		RefreshToken row = refreshTokenRepository.findByTokenHash(hash)
				.orElseThrow(() -> new AppException(
						"app_auth_invalid_refresh",
						"Refresh token invalide.",
						HttpStatus.UNAUTHORIZED));

		if (row.isConsumed()) {
			revokeAllForUser(row.getUser().getId());
			throw new AppException(
					"app_auth_refresh_reuse_detected",
					"Session invalidée pour raison de sécurité, merci de vous reconnecter.",
					HttpStatus.UNAUTHORIZED);
		}

		if (row.getExpiresAt().isBefore(Instant.now())) {
			throw new AppException("app_auth_refresh_expired", "Session expirée.", HttpStatus.UNAUTHORIZED);
		}

		row.setUsedAt(Instant.now());
		refreshTokenRepository.save(row);

		return new RotationResult(
				row.getUser().getId(),
				row.isRememberMe(),
				row.getFamilyId());
	}

	@Transactional
	public void revoke(String rawToken) {
		refreshTokenRepository.findByTokenHash(TokenHasher.sha256(rawToken)).ifPresent(token -> {
			if (token.getRevokedAt() == null) {
				token.setRevokedAt(Instant.now());
				refreshTokenRepository.save(token);
			}
		});
	}

	@Transactional
	public void revokeAllForUser(UUID userId) {
		refreshTokenRepository.revokeAllActiveForUser(userId);
	}

	private static String truncate(String value, int max) {
		if (value == null) {
			return null;
		}
		return value.length() <= max ? value : value.substring(0, max);
	}

	public record RotationResult(UUID userId, boolean rememberMe, UUID familyId) {
	}
}
