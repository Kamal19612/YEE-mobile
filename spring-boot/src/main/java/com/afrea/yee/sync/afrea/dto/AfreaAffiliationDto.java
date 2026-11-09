package com.afrea.yee.sync.afrea.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AfreaAffiliationDto(
		String userExternalId,
		String institutionExternalId,
		String status) {
}
