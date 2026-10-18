package com.afrea.yee.conversations;

import com.afrea.yee.common.ApiPaths;
import java.util.UUID;

/**
 * Chemin d'API des pièces jointes de conversation.
 * Ce n'est pas une URL de stockage : seul un participant authentifié peut le charger.
 */
public final class ChatMediaLinks {

	private ChatMediaLinks() {
	}

	public static String apiPath(UUID conversationId, long mediaId) {
		return ApiPaths.api("/conversations/" + conversationId + "/media/" + mediaId);
	}
}
