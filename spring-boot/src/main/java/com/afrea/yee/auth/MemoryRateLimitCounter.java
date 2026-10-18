package com.afrea.yee.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Compteur local. Le bean de production est {@link JdbcRateLimitCounter}.
 */
final class MemoryRateLimitCounter implements RateLimitCounter {

	private record Counter(int hits, Instant expiresAt) {
	}

	private final Map<String, Counter> counters = new ConcurrentHashMap<>();

	@Override
	public int increment(String key, Duration window) {
		Instant now = Instant.now();
		Counter current = counters.compute(key, (k, existing) -> {
			if (existing == null || existing.expiresAt().isBefore(now)) {
				return new Counter(1, now.plus(window));
			}
			return new Counter(existing.hits() + 1, existing.expiresAt());
		});
		return current.hits();
	}

	@Override
	public void reset(String key) {
		counters.remove(key);
	}
}
