package com.afrea.yee.sync;

import java.time.Instant;

public record SyncRunResult(
		long logId,
		String status,
		int created,
		int updated,
		int skipped,
		int errors,
		Instant generatedAt,
		Instant endedAt) {
}
