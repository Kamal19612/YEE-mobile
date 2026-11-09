package com.afrea.yee.sync;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Résolution upsert : {@code externalId} d'abord, puis email (comptes locaux sans externalId).
 * Ne crée jamais de doublon : si un autre user a déjà le même externalId, on refuse le match email.
 */
@Component
public class UserMirrorMatcher {

	private final UserRepository userRepository;

	public UserMirrorMatcher(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	public Optional<User> findExisting(String externalId, String email) {
		if (externalId != null && !externalId.isBlank()) {
			Optional<User> byExternal = userRepository.findByExternalId(externalId.trim());
			if (byExternal.isPresent()) {
				return byExternal;
			}
		}
		if (email == null || email.isBlank()) {
			return Optional.empty();
		}
		Optional<User> byEmail = userRepository.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT));
		if (byEmail.isEmpty()) {
			return Optional.empty();
		}
		User user = byEmail.get();
		// Déjà lié à un autre externalId → ne pas fusionner (évite les doublons logiques).
		if (user.getExternalId() != null && !user.getExternalId().isBlank()
				&& externalId != null && !externalId.isBlank()
				&& !user.getExternalId().equals(externalId.trim())) {
			return Optional.empty();
		}
		return byEmail;
	}
}
