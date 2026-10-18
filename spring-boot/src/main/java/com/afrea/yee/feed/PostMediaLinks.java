package com.afrea.yee.feed;

import com.afrea.yee.common.ApiPaths;

/**
 * Chemin d'API des médias de post qui ne sont pas publics.
 * Le fichier n'est pas à cette URL de stockage : le service vérifie l'adhésion.
 */
public final class PostMediaLinks {

	private PostMediaLinks() {
	}

	public static String apiPath(long postId, long mediaId) {
		return ApiPaths.api("/feed/" + postId + "/media/" + mediaId);
	}

	public static boolean isApiPath(String url) {
		return url != null && url.matches("(?:/api)?/feed/\\d+/media/\\d+");
	}

	/**
	 * Réécrit les anciennes URLs publiques {@code /media/post-media/…}
	 * vers {@code /api/media/post-media/…} (RestController sous préfixe).
	 */
	public static String normalizeStoredUrl(String url) {
		if (url == null || url.isBlank()) {
			return url;
		}
		if (url.startsWith("/media/post-media/")) {
			return ApiPaths.api(url);
		}
		if ("/feed/pending".equals(url)) {
			return ApiPaths.api("/feed/pending");
		}
		return url;
	}
}
