package com.afrea.yee.institutions;

/** Cycle de vie local d'une institution (imports AfrEA = PENDING). */
public final class InstitutionCreationStatus {

	public static final String PENDING = "PENDING";
	public static final String CREEE = "CREEE";
	public static final String REJETEE = "REJETEE";

	private InstitutionCreationStatus() {
	}

	public static boolean isKnown(String status) {
		return PENDING.equals(status) || CREEE.equals(status) || REJETEE.equals(status);
	}
}
