package com.afrea.yee.sync.afrea.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AfreaPersonDto(
		String externalId,
		String email,
		String displayName,
		String bio,
		String profession,
		String location,
		String organization,
		AfreaSocialLinksDto socialLinks,
		String avatarUrl,
		String coverUrl,
		String languages,
		AfreaMembershipDto membership,
		Instant updatedAt) {
}
