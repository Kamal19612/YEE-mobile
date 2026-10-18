package com.afrea.yee.auth;

import java.time.Duration;

/**
 * Compteur de fenêtre fixe partagé par toutes les instances qui voient
 * le même stockage. L'implémentation mémoire sert aux tests ; le runtime
 * utilise Postgres.
 */
public interface RateLimitCounter {

	/**
	 * @return le nombre de coups dans la fenêtre, y compris celui-ci
	 */
	int increment(String key, Duration window);

	void reset(String key);

	default int purgeExpired() {
		return 0;
	}
}
