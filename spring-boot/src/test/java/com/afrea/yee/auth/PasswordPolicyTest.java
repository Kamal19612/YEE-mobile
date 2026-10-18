package com.afrea.yee.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordPolicyTest {

	@Test
	void rejectsShortAndBlacklistedPasswords() {
		assertThat(PasswordPolicy.errors("short")).isNotEmpty();
		assertThat(PasswordPolicy.errors("password")).contains("Ce mot de passe est trop commun.");
		assertThat(PasswordPolicy.errors("Password123")).contains("Ce mot de passe est trop commun.");
		assertThat(PasswordPolicy.errors("azerty12345")).contains("Ce mot de passe est trop commun.");
		assertThat(PasswordPolicy.errors("correct-horse")).isEmpty();
		assertThat(PasswordPolicy.errors("llllllllll")).anyMatch(m -> m.contains("deux types"));
		assertThat(PasswordPolicy.errors("monmotdepasse")).contains("Ce mot de passe est trop commun.");
	}

	@Test
	void tokenHasherIsStableSha256() {
		String raw = TokenHasher.generateRawToken(32);
		assertThat(raw).hasSize(64);
		assertThat(TokenHasher.sha256(raw)).isEqualTo(TokenHasher.sha256(raw)).hasSize(64);
		assertThat(TokenHasher.sha256(raw)).isNotEqualTo(raw);
	}

	@Test
	void rateLimiterBlocksAfterMaxHits() {
		RateLimiter limiter = new RateLimiter();
		assertThat(limiter.isRateLimited("t", "ip1", 2, java.time.Duration.ofMinutes(1))).isFalse();
		assertThat(limiter.isRateLimited("t", "ip1", 2, java.time.Duration.ofMinutes(1))).isFalse();
		assertThat(limiter.isRateLimited("t", "ip1", 2, java.time.Duration.ofMinutes(1))).isTrue();
		limiter.reset("t", "ip1");
		assertThat(limiter.isRateLimited("t", "ip1", 2, java.time.Duration.ofMinutes(1))).isFalse();
	}
}
