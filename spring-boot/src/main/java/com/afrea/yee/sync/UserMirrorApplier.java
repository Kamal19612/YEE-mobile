package com.afrea.yee.sync;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Applique uniquement les colonnes synchronisées sur un {@link User}.
 * Ne touche jamais mot de passe, status, admin, tokens, compteurs, etc.
 */
@Component
public class UserMirrorApplier {

	private final UserTransformer userTransformer;

	public UserMirrorApplier(UserTransformer userTransformer) {
		this.userTransformer = userTransformer;
	}

	public void applySyncedFields(User user, SyncedUserFields fields, Instant syncedAt) {
		if (fields.email() != null && !fields.email().isBlank()) {
			user.setEmail(fields.email().trim().toLowerCase(Locale.ROOT));
		}
		if (fields.displayName() != null) {
			user.setDisplayName(trimTo(fields.displayName(), 60));
		}
		user.setBio(nullToEmpty(fields.bio(), 500));
		user.setProfession(nullToEmpty(fields.profession(), 120));
		user.setLocation(nullToEmpty(fields.location(), 120));
		user.setOrganization(nullToEmpty(fields.organization(), 120));
		Map<String, String> social = fields.socialLinks() == null ? Map.of() : fields.socialLinks();
		user.setSocialLinksJson(userTransformer.writeSocialLinks(social));
		user.setAvatarUrl(blankToNull(fields.avatarUrl()));
		user.setCoverUrl(blankToNull(fields.coverUrl()));
		user.setLanguages(blankToNull(fields.languages() == null ? null : trimTo(fields.languages(), 255)));
		String membershipType = blankToNull(fields.membershipType());
		if (membershipType != null && !MembershipType.isKnown(membershipType)) {
			throw new IllegalArgumentException("membership.type inconnu: " + membershipType);
		}
		user.setMembershipType(membershipType);
		user.setMembershipExpiresOn(fields.membershipExpiresOn());
		user.setMembershipYee(fields.membershipYee() != null && fields.membershipYee());
		user.setLastSyncedAt(syncedAt);
	}

	private static String nullToEmpty(String value, int max) {
		if (value == null || value.isBlank()) {
			return "";
		}
		return trimTo(value.trim(), max);
	}

	private static String blankToNull(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim();
	}

	private static String trimTo(String value, int max) {
		String v = value == null ? "" : value.trim();
		return v.length() <= max ? v : v.substring(0, max);
	}
}
