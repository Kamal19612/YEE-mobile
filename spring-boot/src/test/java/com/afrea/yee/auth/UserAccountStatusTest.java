package com.afrea.yee.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UserAccountStatusTest {

	@Test
	void fromLegacyFlagsMapsDeactivatedAndDeletedToDesactive() {
		assertThat(UserAccountStatus.fromLegacyFlags(true, true, false))
				.isEqualTo(UserAccountStatus.DESACTIVE);
		assertThat(UserAccountStatus.fromLegacyFlags(false, false, true))
				.isEqualTo(UserAccountStatus.DESACTIVE);
	}

	@Test
	void fromLegacyFlagsMapsActiveAccountsToActif() {
		assertThat(UserAccountStatus.fromLegacyFlags(true, false, false))
				.isEqualTo(UserAccountStatus.ACTIF);
		// Auto-inscrit non vérifié : status ACTIF, emailVerified reste le garde-fou login.
		assertThat(UserAccountStatus.fromLegacyFlags(false, false, false))
				.isEqualTo(UserAccountStatus.ACTIF);
	}

	@Test
	void isKnownAcceptsCanonicalValuesOnly() {
		assertThat(UserAccountStatus.isKnown(UserAccountStatus.A_VERIFIER)).isTrue();
		assertThat(UserAccountStatus.isKnown(UserAccountStatus.VERIFIE)).isTrue();
		assertThat(UserAccountStatus.isKnown(UserAccountStatus.ACTIF)).isTrue();
		assertThat(UserAccountStatus.isKnown(UserAccountStatus.DESACTIVE)).isTrue();
		assertThat(UserAccountStatus.isKnown("PENDING")).isFalse();
	}
}
