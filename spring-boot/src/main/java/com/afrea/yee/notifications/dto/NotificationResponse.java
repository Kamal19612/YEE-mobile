package com.afrea.yee.notifications.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record NotificationResponse(
		String id,
		String type,
		ActorResponse actor,
		SubjectResponse subject,
		@JsonProperty("isRead") boolean isRead,
		String createdAt,
		String targetId
) {
	public record ActorResponse(String id, String displayName, String avatarUrl, String profession) {
	}

	public record SubjectResponse(String type, String id, String name) {
	}
}
