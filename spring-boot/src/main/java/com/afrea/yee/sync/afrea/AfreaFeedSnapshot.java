package com.afrea.yee.sync.afrea;

import com.afrea.yee.sync.afrea.dto.AfreaAffiliationDto;
import com.afrea.yee.sync.afrea.dto.AfreaFeedPageDto;
import com.afrea.yee.sync.afrea.dto.AfreaInstitutionDto;
import com.afrea.yee.sync.afrea.dto.AfreaPersonDto;
import com.afrea.yee.sync.afrea.dto.AfreaReferentDto;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Agrégat multi-pages du feed AfrEA (prêt pour le job de sync). */
public record AfreaFeedSnapshot(
		Instant generatedAt,
		List<AfreaPersonDto> people,
		List<AfreaInstitutionDto> institutions,
		List<AfreaAffiliationDto> affiliations,
		List<AfreaReferentDto> referents) {

	public static AfreaFeedSnapshot fromPages(Instant generatedAt, List<AfreaFeedPageDto> pages) {
		Map<String, AfreaPersonDto> people = new LinkedHashMap<>();
		Map<String, AfreaInstitutionDto> institutions = new LinkedHashMap<>();
		Map<String, AfreaAffiliationDto> affiliations = new LinkedHashMap<>();
		Map<String, AfreaReferentDto> referents = new LinkedHashMap<>();

		for (AfreaFeedPageDto page : pages) {
			for (AfreaPersonDto p : page.peopleOrEmpty()) {
				if (p.externalId() != null && !p.externalId().isBlank()) {
					people.put(p.externalId(), p);
				}
			}
			for (AfreaInstitutionDto i : page.institutionsOrEmpty()) {
				if (i.externalId() != null && !i.externalId().isBlank()) {
					institutions.put(i.externalId(), i);
				}
			}
			for (AfreaAffiliationDto a : page.affiliationsOrEmpty()) {
				String key = a.userExternalId() + "|" + a.institutionExternalId();
				affiliations.put(key, a);
			}
			for (AfreaReferentDto r : page.referentsOrEmpty()) {
				String key = r.userExternalId() + "|" + r.institutionExternalId();
				referents.put(key, r);
			}
		}

		return new AfreaFeedSnapshot(
				generatedAt,
				List.copyOf(new ArrayList<>(people.values())),
				List.copyOf(new ArrayList<>(institutions.values())),
				List.copyOf(new ArrayList<>(affiliations.values())),
				List.copyOf(new ArrayList<>(referents.values())));
	}
}
