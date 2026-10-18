package com.afrea.yee.institutions.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record InstitutionResponse(
		String id,
		String parentId,
		String type,
		String name,
		String slug,
		String description,
		int membersCount,
		String createdAt,
		String viewerAffiliationStatus,
		@JsonProperty("viewerIsReferent") boolean viewerIsReferent,
		String countryName,
		String continentName,
		String affiliationStatus
) {
}
