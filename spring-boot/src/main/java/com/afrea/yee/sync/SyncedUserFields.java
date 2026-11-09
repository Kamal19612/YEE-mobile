package com.afrea.yee.sync;

import java.time.LocalDate;
import java.util.Map;

/**
 * Snapshot des colonnes People écrasées à chaque synchro AfrEA.
 * Les champs locaux (mot de passe, status, rôle admin, tokens, …) n'y figurent pas.
 */
public record SyncedUserFields(
		String email,
		String displayName,
		String bio,
		String profession,
		String location,
		String organization,
		Map<String, String> socialLinks,
		String avatarUrl,
		String coverUrl,
		String languages,
		String membershipType,
		LocalDate membershipExpiresOn,
		Boolean membershipYee) {
}
