package com.afrea.yee.sync.afrea.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AfreaSocialLinksDto(
		String linkedin,
		String twitter,
		String website) {
}
