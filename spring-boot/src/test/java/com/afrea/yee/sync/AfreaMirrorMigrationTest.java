package com.afrea.yee.sync;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** Garde-fou : la migration miroir AfrEA reste complète et non destructive. */
class AfreaMirrorMigrationTest {

	@Test
	void v31AddsMirrorColumnsAndSyncTables() throws IOException {
		String sql = new ClassPathResource("db/migration/V31__afrea_mirror_sync.sql")
				.getContentAsString(StandardCharsets.UTF_8);

		assertThat(sql).contains("ALTER COLUMN password_hash DROP NOT NULL");
		assertThat(sql).contains("external_id");
		assertThat(sql).contains("A_VERIFIER");
		assertThat(sql).contains("languages");
		assertThat(sql).contains("membership_type");
		assertThat(sql).contains("membership_expires_on");
		assertThat(sql).contains("membership_yee");
		assertThat(sql).contains("creation_status");
		assertThat(sql).contains("ALTER COLUMN created_by DROP NOT NULL");
		assertThat(sql).contains("CREATE TABLE IF NOT EXISTS sync_log");
		assertThat(sql).contains("CREATE TABLE IF NOT EXISTS sync_state");
		assertThat(sql).contains("ENABLE ROW LEVEL SECURITY");
		assertThat(sql).contains("TO yee_api");
	}
}
