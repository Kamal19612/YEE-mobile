package com.afrea.yee.sync;

import java.util.ArrayList;
import java.util.List;

/** Compteurs + détails d'erreurs (sans PII) pour {@code sync_log}. */
public class SyncCounters {

	private int created;
	private int updated;
	private int skipped;
	private int errors;
	private final List<String> errorDetails = new ArrayList<>();

	public void created() {
		created++;
	}

	public void updated() {
		updated++;
	}

	public void skipped() {
		skipped++;
	}

	public void error(String detail) {
		errors++;
		if (detail != null && !detail.isBlank() && errorDetails.size() < 200) {
			errorDetails.add(detail);
		}
	}

	public int getCreated() {
		return created;
	}

	public int getUpdated() {
		return updated;
	}

	public int getSkipped() {
		return skipped;
	}

	public int getErrors() {
		return errors;
	}

	public List<String> getErrorDetails() {
		return List.copyOf(errorDetails);
	}

	public String errorDetailsAsText() {
		return String.join("\n", errorDetails);
	}
}
