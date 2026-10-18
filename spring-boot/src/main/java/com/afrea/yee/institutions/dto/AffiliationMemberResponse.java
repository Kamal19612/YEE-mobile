package com.afrea.yee.institutions.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AffiliationMemberResponse(
		String id,
		String displayName,
		String avatarUrl,
		String profession,
		String status,
		boolean isReferent,
		String requestedAt,
		String decidedAt,
		AffiliationUserResponse user
) {
}
