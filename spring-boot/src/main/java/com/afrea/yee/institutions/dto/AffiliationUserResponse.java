package com.afrea.yee.institutions.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AffiliationUserResponse(
		String id,
		String displayName,
		String avatarUrl,
		String coverUrl,
		String profession
) {
}
