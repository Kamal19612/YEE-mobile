package com.afrea.yee.sync.afrea.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDate;

@JsonIgnoreProperties(ignoreUnknown = true)
public record AfreaMembershipDto(
		String type,
		LocalDate expiresOn,
		Boolean yee) {
}
