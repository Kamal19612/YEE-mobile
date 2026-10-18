package com.afrea.yee.auth;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Mots de passe refusés à l'inscription, au changement et à la réinitialisation.
 * Longueur minimale 10, au moins deux types de caractères, et une égalité
 * exacte avec une liste noire (insensible à la casse). La liste ne remplace
 * pas un dictionnaire complet.
 */
public final class PasswordPolicy {

	private static final Set<String> BLACKLIST = Set.of(
			"password",
			"password1",
			"password12",
			"password123",
			"password1234",
			"passw0rd123",
			"motdepasse",
			"motdepasse1",
			"motdepasse12",
			"motdepasse123",
			"monmotdepasse",
			"azertyuiop",
			"azerty123",
			"azerty1234",
			"azerty12345",
			"qwertyuiop",
			"qwerty123",
			"qwerty1234",
			"qwerty12345",
			"1234567890",
			"12345678910",
			"abcdefghij",
			"adminadmin",
			"admin12345",
			"administrator",
			"welcome123",
			"bienvenue1",
			"bienvenue123",
			"bonjour123",
			"changeme123",
			"letmein123",
			"iloveyou123",
			"secret1234",
			"test123456",
			"football123",
			"starwars123",
			"superman123",
			"sunshine123",
			"princess123",
			"dragon1234",
			"master1234",
			"access1234");

	private PasswordPolicy() {
	}

	public static List<String> errors(String password) {
		List<String> errors = new ArrayList<>();
		if (password == null || password.length() < 10) {
			errors.add("Le mot de passe doit contenir au moins 10 caractères.");
		}
		if (password != null && password.length() > 256) {
			errors.add("Le mot de passe est trop long.");
		}
		if (password != null && BLACKLIST.contains(password.toLowerCase(Locale.ROOT))) {
			errors.add("Ce mot de passe est trop commun.");
		}
		if (password != null && password.length() >= 10 && !mixesCharacterTypes(password)) {
			errors.add("Le mot de passe doit mélanger au moins deux types de caractères (lettres, chiffres ou signes).");
		}
		return errors;
	}

	private static boolean mixesCharacterTypes(String password) {
		boolean lower = false;
		boolean upper = false;
		boolean digit = false;
		boolean other = false;
		for (int i = 0; i < password.length(); i++) {
			char c = password.charAt(i);
			if (Character.isLowerCase(c)) {
				lower = true;
			} else if (Character.isUpperCase(c)) {
				upper = true;
			} else if (Character.isDigit(c)) {
				digit = true;
			} else {
				other = true;
			}
		}
		int kinds = (lower ? 1 : 0) + (upper ? 1 : 0) + (digit ? 1 : 0) + (other ? 1 : 0);
		return kinds >= 2;
	}
}
