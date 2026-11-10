package com.afrea.yee.admin.dto;

public record AdminInstitutionListItemResponse(
		String id,
		String externalId,
		String parentId,
		String type,
		String name,
		String slug,
		String description,
		String creationStatus,
		int membersCount,
		String createdAt,
		String updatedAt) {
}
