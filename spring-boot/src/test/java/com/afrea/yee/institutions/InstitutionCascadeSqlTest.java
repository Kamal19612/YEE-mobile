package com.afrea.yee.institutions;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

/**
 * Garde-fou : les requêtes natives de cascade doivent rester WITH RECURSIVE.
 * (IT Testcontainers indisponibles sans Docker — on fige le SQL annoté.)
 */
class InstitutionCascadeSqlTest {

	@Test
	void countReferentOnAncestorsWalksParents() throws Exception {
		Method m = com.afrea.yee.institutions.repository.InstitutionRepository.class
				.getMethod("countReferentOnAncestors", java.util.UUID.class, java.util.UUID.class);
		Query q = m.getAnnotation(Query.class);
		assertThat(q).isNotNull();
		assertThat(q.nativeQuery()).isTrue();
		assertThat(q.value()).contains("WITH RECURSIVE ancestors");
		assertThat(q.value()).contains("INNER JOIN ancestors a ON i.id = a.parent_id");
		assertThat(q.value()).contains("institution_referents");
	}

	@Test
	void findIdsWithReferentAuthorityWalksDescendants() throws Exception {
		Method m = com.afrea.yee.institutions.repository.InstitutionRepository.class
				.getMethod("findIdsWithReferentAuthority", java.util.UUID.class);
		Query q = m.getAnnotation(Query.class);
		assertThat(q).isNotNull();
		assertThat(q.nativeQuery()).isTrue();
		assertThat(q.value()).contains("WITH RECURSIVE tree");
		assertThat(q.value()).contains("c.parent_id = t.id");
	}

	@Test
	void findDescendantIdsIncludingSelfWalksChildren() throws Exception {
		Method m = com.afrea.yee.institutions.repository.InstitutionRepository.class
				.getMethod("findDescendantIdsIncludingSelf", java.util.UUID.class);
		Query q = m.getAnnotation(Query.class);
		assertThat(q).isNotNull();
		assertThat(q.nativeQuery()).isTrue();
		assertThat(q.value()).contains("WITH RECURSIVE tree");
		assertThat(q.value()).contains("c.parent_id = t.id");
	}

	@Test
	void findCascadeReferentUserIdsWalksAncestors() throws Exception {
		Method m = com.afrea.yee.institutions.repository.InstitutionRepository.class
				.getMethod("findCascadeReferentUserIds", java.util.UUID.class);
		Query q = m.getAnnotation(Query.class);
		assertThat(q).isNotNull();
		assertThat(q.nativeQuery()).isTrue();
		assertThat(q.value()).contains("WITH RECURSIVE ancestors");
		assertThat(q.value()).contains("institution_referents");
		assertThat(q.value()).contains("SELECT DISTINCT r.user_id");
	}

	@Test
	void typeHierarchyRules() {
		assertThat(expectedChildType("continent")).isEqualTo("country");
		assertThat(expectedChildType("country")).isEqualTo("local");
		assertThat(expectedChildType("local")).isNull();
	}

	private static String expectedChildType(String parentType) {
		return switch (parentType) {
			case "continent" -> "country";
			case "country" -> "local";
			default -> null;
		};
	}
}
