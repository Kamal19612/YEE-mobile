package com.afrea.yee.sync.afrea.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;
import java.util.List;

/** Réponse {@code GET /aed-feed/?ids=1} — ids encore présents dans le feed. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AfreaIdsResponseDto(
		Instant generatedAt,
		List<String> ids) {

	public List<String> idsOrEmpty() {
		return ids == null ? List.of() : ids;
	}
}
