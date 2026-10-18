package com.afrea.yee.common.ratelimit;

import com.afrea.yee.auth.RateLimiter;
import com.afrea.yee.common.exception.AppException;
import java.time.Duration;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Rate limits sur les écritures métier.
 * <p>
 * <b>Écart volontaire vs audit PHP</b> : l'audit (§risques) signale l'absence de
 * rate limit hors auth comme un trou connu jamais corrigé. On ne le reproduit pas —
 * les actions create post/commentaire/groupe/institution + link-preview sont limitées
 * par userId (fenêtre fixe, mémoire locale — non partagé multi-instance).
 */
@Component
public class WriteRateLimit {

	private final RateLimiter rateLimiter;

	public WriteRateLimit(RateLimiter rateLimiter) {
		this.rateLimiter = rateLimiter;
	}

	public void checkCreatePost(UUID userId) {
		check("create_post", userId, 30, Duration.ofHours(1));
	}

	public void checkCreateComment(UUID userId) {
		check("create_comment", userId, 60, Duration.ofHours(1));
	}

	public void checkCreateGroup(UUID userId) {
		check("create_group", userId, 5, Duration.ofHours(1));
	}

	public void checkCreateInstitution(UUID userId) {
		check("create_institution", userId, 5, Duration.ofHours(1));
	}

	public void checkCreateResource(UUID userId) {
		check("create_resource", userId, 20, Duration.ofHours(1));
	}

	public void checkCreateEvent(UUID userId) {
		check("create_event", userId, 30, Duration.ofHours(1));
	}

	public void checkLinkPreview(UUID userId) {
		check("link_preview", userId, 30, Duration.ofMinutes(15));
	}

	public void checkSendMessage(UUID userId) {
		check("send_message", userId, 120, Duration.ofHours(1));
	}

	public void checkTyping(UUID userId) {
		check("typing", userId, 30, Duration.ofMinutes(1));
	}

	private void check(String action, UUID userId, int maxHits, Duration window) {
		String id = userId == null ? "anon" : userId.toString();
		if (rateLimiter.isRateLimited(action, id, maxHits, window)) {
			throw new AppException(
					"rate_limited",
					"Trop de tentatives, réessayez plus tard.",
					HttpStatus.TOO_MANY_REQUESTS);
		}
	}
}
