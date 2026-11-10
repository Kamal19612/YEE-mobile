package com.afrea.yee.sync;

import com.afrea.yee.institutions.InstitutionCreationStatus;
import com.afrea.yee.institutions.entity.Institution;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.sync.afrea.dto.AfreaInstitutionDto;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class InstitutionMirrorApplier {

	private static final Set<String> TYPES = Set.of("continent", "country", "local");

	private final InstitutionRepository institutionRepository;

	public InstitutionMirrorApplier(InstitutionRepository institutionRepository) {
		this.institutionRepository = institutionRepository;
	}

	public void applySyncedFields(Institution institution, AfreaInstitutionDto dto, Institution parent, boolean isNew) {
		String name = dto.name() == null ? "" : dto.name().trim();
		if (name.length() < 2) {
			throw new IllegalArgumentException("institution.name trop court");
		}
		String type = dto.type() == null ? "" : dto.type().trim().toLowerCase(Locale.ROOT);
		if (!TYPES.contains(type)) {
			throw new IllegalArgumentException("institution.type invalide: " + dto.type());
		}

		institution.setExternalId(dto.externalId().trim());
		institution.setName(trimTo(name, 160));
		institution.setType(type);
		institution.setDescription(dto.description() == null ? "" : trimTo(dto.description().trim(), 4000));
		institution.setParent(parent);
		if (isNew) {
			institution.setCreationStatus(InstitutionCreationStatus.PENDING);
			institution.setCreatedBy(null);
			institution.setMembersCount(0);
			institution.setSlug(uniqueSlug(name));
		}
	}

	public static int typeOrder(String type) {
		if (type == null) {
			return 99;
		}
		return switch (type.trim().toLowerCase(Locale.ROOT)) {
			case "continent" -> 0;
			case "country" -> 1;
			case "local" -> 2;
			default -> 99;
		};
	}

	private String uniqueSlug(String name) {
		String base = name.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("^-+|-+$", "");
		if (base.isBlank()) {
			base = "institution";
		}
		String slug = base;
		int i = 1;
		while (institutionRepository.existsBySlug(slug)) {
			slug = base + "-" + i++;
		}
		return slug;
	}

	private static String trimTo(String value, int max) {
		return value.length() <= max ? value : value.substring(0, max);
	}
}
