package com.afrea.yee.sync;

/** Valeurs {@code membership.type} du feed AfrEA (colonne synchronisée). */
public final class MembershipType {

	public static final String INDIVIDUAL = "individual";
	public static final String VOPE_MEMBER = "vope_member";
	public static final String INST_MEMBER = "inst_member";

	private MembershipType() {
	}

	public static boolean isKnown(String type) {
		return INDIVIDUAL.equals(type) || VOPE_MEMBER.equals(type) || INST_MEMBER.equals(type);
	}
}
