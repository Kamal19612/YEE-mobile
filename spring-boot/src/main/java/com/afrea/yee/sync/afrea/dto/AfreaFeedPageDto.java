package com.afrea.yee.sync.afrea.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;

/**
 * Page du feed {@code GET /aed-feed/}.
 * Noms d'enveloppe alignés sur l'onglet Connection (has_more / next_after) ;
 * {@link JsonAlias} accepte aussi le camelCase au cas où.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AfreaFeedPageDto(
		Instant generatedAt,
		@JsonProperty("has_more")
		@JsonAlias("hasMore")
		Boolean hasMore,
		@JsonProperty("next_after")
		@JsonAlias("nextAfter")
		String nextAfter,
		/** Feed live AfrEA : clé JSON {@code users} (alias {@code people} pour fixtures). */
		@JsonProperty("users")
		@JsonAlias("people")
		List<AfreaPersonDto> people,
		List<AfreaInstitutionDto> institutions,
		List<AfreaAffiliationDto> affiliations,
		List<AfreaReferentDto> referents) {

	public boolean more() {
		return Boolean.TRUE.equals(hasMore);
	}

	public List<AfreaPersonDto> peopleOrEmpty() {
		return people == null ? List.of() : people;
	}

	public List<AfreaInstitutionDto> institutionsOrEmpty() {
		return institutions == null ? List.of() : institutions;
	}

	public List<AfreaAffiliationDto> affiliationsOrEmpty() {
		return affiliations == null ? List.of() : affiliations;
	}

	public List<AfreaReferentDto> referentsOrEmpty() {
		return referents == null ? List.of() : referents;
	}
}
