package com.afrea.yee.groups.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GroupResponse(
		String id,
		String name,
		String slug,
		String description,
		String coverUrl,
		String visibility,
		int membersCount,
		String createdAt,
		String viewerStatus,
		@JsonProperty("viewerRole") String viewerRole,
		@JsonProperty("viewerIsCreator") boolean viewerIsCreator
) {
}
