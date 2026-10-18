package com.afrea.yee.auth;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Même fenêtre fixe pour chaque instance de l'API : la ligne est verrouillée
 * par Postgres au moment du ON CONFLICT.
 */
@Component
public class JdbcRateLimitCounter implements RateLimitCounter {

	private final JdbcTemplate jdbc;

	public JdbcRateLimitCounter(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public int increment(String key, Duration window) {
		Timestamp expiresAt = Timestamp.from(Instant.now().plus(window));
		Integer hits = jdbc.queryForObject(
				"""
				INSERT INTO rate_limit_buckets (bucket_key, hits, expires_at)
				VALUES (?, 1, ?)
				ON CONFLICT (bucket_key) DO UPDATE SET
				  hits = CASE
				    WHEN rate_limit_buckets.expires_at <= CURRENT_TIMESTAMP THEN 1
				    ELSE rate_limit_buckets.hits + 1
				  END,
				  expires_at = CASE
				    WHEN rate_limit_buckets.expires_at <= CURRENT_TIMESTAMP THEN EXCLUDED.expires_at
				    ELSE rate_limit_buckets.expires_at
				  END
				RETURNING hits
				""",
				Integer.class,
				key,
				expiresAt);
		return hits == null ? 1 : hits;
	}

	@Override
	public void reset(String key) {
		jdbc.update("DELETE FROM rate_limit_buckets WHERE bucket_key = ?", key);
	}

	@Override
	public int purgeExpired() {
		return jdbc.update("DELETE FROM rate_limit_buckets WHERE expires_at <= CURRENT_TIMESTAMP");
	}
}
