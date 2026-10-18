package com.afrea.yee.auth;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Plafond par action. Le compteur de production est en base
 * ({@link JdbcRateLimitCounter}) pour être commun à plusieurs instances.
 * Les tests construisent un compteur mémoire.
 */
@Component
public class RateLimiter {

	private static final Set<String> DEFAULT_TRUSTED_PROXIES = Set.of("127.0.0.1", "::1");

	private final RateLimitCounter counter;
	private final Set<String> trustedProxies;

	public RateLimiter() {
		this(new MemoryRateLimitCounter(), DEFAULT_TRUSTED_PROXIES);
	}

	@Autowired
	public RateLimiter(
			RateLimitCounter counter,
			@Value("${app.trusted-proxies:127.0.0.1,::1}") String trustedProxies) {
		this(counter, parseTrustedProxies(trustedProxies));
	}

	RateLimiter(Set<String> trustedProxies) {
		this(new MemoryRateLimitCounter(), trustedProxies);
	}

	RateLimiter(RateLimitCounter counter, Set<String> trustedProxies) {
		this.counter = counter;
		this.trustedProxies = trustedProxies;
	}

	public boolean isRateLimited(String action, String identifier, int maxHits, Duration window) {
		int hits = counter.increment(cacheKey(action, identifier), window);
		return hits > maxHits;
	}

	public void reset(String action, String identifier) {
		counter.reset(cacheKey(action, identifier));
	}

	/**
	 * Adresse utilisée pour les limites de tentatives.
	 * X-Forwarded-For et CF-Connecting-IP sont ignorés si le visiteur parle
	 * directement à l'API : il pourrait inventer ces en-têtes et contourner le quota.
	 * Derrière un proxy de confiance (Apache sur cette machine), on prend la
	 * dernière adresse de X-Forwarded-For, celle que le proxy a ajoutée.
	 */
	public String clientIp(HttpServletRequest request) {
		String remote = request.getRemoteAddr();
		if (remote == null || remote.isBlank()) {
			return "0.0.0.0";
		}
		if (!trustedProxies.contains(normalizeIp(remote))) {
			return remote;
		}
		String xff = request.getHeader("X-Forwarded-For");
		if (xff == null || xff.isBlank()) {
			return remote;
		}
		String[] parts = xff.split(",");
		for (int i = parts.length - 1; i >= 0; i--) {
			String hop = parts[i].trim();
			if (!hop.isEmpty() && !trustedProxies.contains(normalizeIp(hop))) {
				return hop;
			}
		}
		return remote;
	}

	private static Set<String> parseTrustedProxies(String raw) {
		if (raw == null || raw.isBlank()) {
			return DEFAULT_TRUSTED_PROXIES;
		}
		Set<String> parsed = Arrays.stream(raw.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.map(RateLimiter::normalizeIp)
				.collect(Collectors.toSet());
		return parsed.isEmpty() ? DEFAULT_TRUSTED_PROXIES : Set.copyOf(parsed);
	}

	private static String normalizeIp(String ip) {
		if ("0:0:0:0:0:0:0:1".equals(ip) || "0:0:0:0:0:0:0:1%0".equals(ip)) {
			return "::1";
		}
		return ip;
	}

	private static String cacheKey(String action, String identifier) {
		return action + ":" + TokenHasher.sha256(identifier == null ? "" : identifier);
	}
}
