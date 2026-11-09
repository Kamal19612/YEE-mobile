package com.afrea.yee.auth;

/**
 * Statut de compte AED (colonne locale, jamais écrasée par la sync AfrEA).
 * <ul>
 *   <li>{@link #A_VERIFIER} — importé, en attente de validation admin</li>
 *   <li>{@link #VERIFIE} — admin a validé, en attente de mot de passe</li>
 *   <li>{@link #ACTIF} — peut se connecter (mdp défini + règles login)</li>
 *   <li>{@link #DESACTIVE} — désactivé / hors feed AfrEA (pas de delete physique)</li>
 * </ul>
 */
public final class UserAccountStatus {

	public static final String A_VERIFIER = "A_VERIFIER";
	public static final String VERIFIE = "VERIFIE";
	public static final String ACTIF = "ACTIF";
	public static final String DESACTIVE = "DESACTIVE";

	private UserAccountStatus() {
	}

	/**
	 * Backfill / dérivation depuis les booléens historiques.
	 * Les comptes auto-inscrits non vérifiés restent {@link #ACTIF} :
	 * {@code emailVerified} continue de bloquer le login.
	 */
	public static String fromLegacyFlags(boolean emailVerified, boolean accountDeactivated, boolean accountDeleted) {
		if (accountDeleted || accountDeactivated) {
			return DESACTIVE;
		}
		if (emailVerified) {
			return ACTIF;
		}
		return ACTIF;
	}

	public static boolean isKnown(String status) {
		return A_VERIFIER.equals(status)
				|| VERIFIE.equals(status)
				|| ACTIF.equals(status)
				|| DESACTIVE.equals(status);
	}
}
