package com.afrea.yee.common;

/**
 * Préfixe public de l’API REST.
 * Les routes SPA ({@code /feed}, {@code /notifications}, …) restent hors de ce préfixe
 * pour éviter que le reverse proxy renvoie du JSON à la place de React.
 */
public final class ApiPaths {

	public static final String ROOT = "/api";

	private ApiPaths() {}

	/** Préfixe un chemin absolu applicatif ({@code /feed/…} → {@code /api/feed/…}). */
	public static String api(String absolutePath) {
		if (absolutePath == null || absolutePath.isBlank()) {
			return ROOT;
		}
		if (absolutePath.startsWith(ROOT + "/") || absolutePath.equals(ROOT)) {
			return absolutePath;
		}
		return absolutePath.startsWith("/") ? ROOT + absolutePath : ROOT + "/" + absolutePath;
	}
}
