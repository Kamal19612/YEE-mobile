package com.afrea.yee.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** Garde-fou : la migration qui coupe PostgREST ne disparaît pas au fil des évolutions. */
class ApiRoleMigrationTest {

	@Test
	void locksDataApiAndDefinesNonSuperuserRole() throws IOException {
		String sql = new ClassPathResource("db/migration/V15__api_role_rls.sql")
				.getContentAsString(StandardCharsets.UTF_8);

		assertThat(sql).contains("CREATE ROLE yee_api");
		assertThat(sql).contains("NOSUPERUSER");
		assertThat(sql).contains("NOBYPASSRLS");
		assertThat(sql).contains("ENABLE ROW LEVEL SECURITY");
		assertThat(sql).contains("FORCE ROW LEVEL SECURITY");
		assertThat(sql).contains("TO yee_api");
		assertThat(sql).contains("'anon'");
		assertThat(sql).contains("'authenticated'");
		assertThat(sql).contains("'service_role'");
		assertThat(sql).contains("flyway_schema_history");
	}

	@Test
	void rateLimitTableForcesRowSecurity() throws IOException {
		String sql = new ClassPathResource("db/migration/V18__rate_limit_buckets.sql")
				.getContentAsString(StandardCharsets.UTF_8);
		assertThat(sql).contains("rate_limit_buckets");
		assertThat(sql).contains("ENABLE ROW LEVEL SECURITY");
		assertThat(sql).contains("FORCE ROW LEVEL SECURITY");
		assertThat(sql).contains("TO yee_api");
	}
}
