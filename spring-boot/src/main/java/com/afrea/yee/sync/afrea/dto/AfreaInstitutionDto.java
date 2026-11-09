package com.afrea.yee.sync.afrea.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AfreaInstitutionDto(
		String externalId,
		String name,
		String type,
		String parentExternalId,
		String description) {
}
