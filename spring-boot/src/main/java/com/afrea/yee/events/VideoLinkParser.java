package com.afrea.yee.events;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Normalise une URL vidéo YouTube / LinkedIn / Google Drive pour l’affichage.
 * YouTube + Drive (partage public) → embed ; LinkedIn → lien externe.
 */
public final class VideoLinkParser {

	public record ParsedVideo(String url, String provider, String externalId, String embedUrl) {
	}

	private static final Pattern YOUTUBE_ID = Pattern.compile(
			"(?:youtu\\.be/|youtube\\.com/(?:watch\\?v=|embed/|shorts/|live/))([A-Za-z0-9_-]{6,})",
			Pattern.CASE_INSENSITIVE);

	private static final Pattern DRIVE_FILE = Pattern.compile(
			"/file/d/([A-Za-z0-9_-]{10,})",
			Pattern.CASE_INSENSITIVE);

	private VideoLinkParser() {
	}

	public static ParsedVideo parse(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String trimmed = raw.trim();
		URI uri;
		try {
			uri = URI.create(trimmed);
		} catch (IllegalArgumentException ex) {
			throw new IllegalArgumentException("URL vidéo invalide.");
		}
		String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
		if (!scheme.equals("http") && !scheme.equals("https")) {
			throw new IllegalArgumentException("L’URL vidéo doit commencer par https://.");
		}
		String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
		String normalized = uri.toString();

		if (host.contains("youtube.com") || host.equals("youtu.be") || host.endsWith(".youtu.be")) {
			String id = extractYoutubeId(normalized);
			if (id == null) {
				throw new IllegalArgumentException("Lien YouTube non reconnu.");
			}
			return new ParsedVideo(
					"https://www.youtube.com/watch?v=" + id,
					"youtube",
					id,
					"https://www.youtube.com/embed/" + id);
		}

		if (host.contains("drive.google.com") || host.contains("docs.google.com")) {
			String id = extractDriveId(uri, normalized);
			if (id == null) {
				throw new IllegalArgumentException(
						"Lien Google Drive non reconnu. Utilisez un lien de type « Partager → Toute personne disposant du lien ».");
			}
			return new ParsedVideo(
					"https://drive.google.com/file/d/" + id + "/view",
					"drive",
					id,
					"https://drive.google.com/file/d/" + id + "/preview");
		}

		if (host.contains("linkedin.com")) {
			return new ParsedVideo(normalized, "linkedin", null, null);
		}

		return new ParsedVideo(normalized, "other", null, null);
	}

	static String extractYoutubeId(String url) {
		Matcher matcher = YOUTUBE_ID.matcher(url);
		if (matcher.find()) {
			return matcher.group(1);
		}
		try {
			URI uri = URI.create(url);
			String query = uri.getQuery();
			if (query != null) {
				for (String part : query.split("&")) {
					String[] kv = part.split("=", 2);
					if (kv.length == 2 && "v".equalsIgnoreCase(kv[0]) && kv[1].matches("[A-Za-z0-9_-]{6,}")) {
						return kv[1];
					}
				}
			}
		} catch (IllegalArgumentException ignored) {
			// fall through
		}
		return null;
	}

	static String extractDriveId(URI uri, String url) {
		Matcher matcher = DRIVE_FILE.matcher(url);
		if (matcher.find()) {
			return matcher.group(1);
		}
		String query = uri.getQuery();
		if (query != null) {
			for (String part : query.split("&")) {
				String[] kv = part.split("=", 2);
				if (kv.length == 2 && "id".equalsIgnoreCase(kv[0]) && kv[1].matches("[A-Za-z0-9_-]{10,}")) {
					return kv[1];
				}
			}
		}
		return null;
	}
}
