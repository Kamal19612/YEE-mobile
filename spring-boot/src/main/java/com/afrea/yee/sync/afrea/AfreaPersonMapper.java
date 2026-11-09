package com.afrea.yee.sync.afrea;

import com.afrea.yee.sync.SyncedUserFields;
import com.afrea.yee.sync.afrea.dto.AfreaMembershipDto;
import com.afrea.yee.sync.afrea.dto.AfreaPersonDto;
import com.afrea.yee.sync.afrea.dto.AfreaSocialLinksDto;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/** DTO AfrEA People → colonnes synchronisées AED. */
@Component
public class AfreaPersonMapper {

	public SyncedUserFields toSyncedFields(AfreaPersonDto person) {
		if (person == null) {
			throw new IllegalArgumentException("person required");
		}
		AfreaMembershipDto membership = person.membership();
		return new SyncedUserFields(
				person.email(),
				person.displayName(),
				person.bio(),
				person.profession(),
				person.location(),
				person.organization(),
				toSocialMap(person.socialLinks()),
				person.avatarUrl(),
				person.coverUrl(),
				person.languages(),
				membership == null ? null : membership.type(),
				membership == null ? null : membership.expiresOn(),
				membership == null ? null : membership.yee());
	}

	private static Map<String, String> toSocialMap(AfreaSocialLinksDto social) {
		Map<String, String> map = new LinkedHashMap<>();
		if (social == null) {
			return map;
		}
		if (social.linkedin() != null && !social.linkedin().isBlank()) {
			map.put("linkedin", social.linkedin().trim());
		}
		if (social.twitter() != null && !social.twitter().isBlank()) {
			map.put("twitter", social.twitter().trim());
		}
		if (social.website() != null && !social.website().isBlank()) {
			map.put("website", social.website().trim());
		}
		return map;
	}
}
