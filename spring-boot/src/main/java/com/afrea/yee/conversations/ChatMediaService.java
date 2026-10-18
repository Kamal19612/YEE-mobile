package com.afrea.yee.conversations;

import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.conversations.entity.Conversation;
import com.afrea.yee.conversations.entity.ConversationMessageMedia;
import com.afrea.yee.conversations.repository.ConversationMessageMediaRepository;
import com.afrea.yee.media.ObjectStorage;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sert les fichiers du bucket {@code chat-media} uniquement au participant
 * (ou à l'admin site). Le fichier ne passe plus par {@code /media/**}.
 */
@Service
public class ChatMediaService {

	static final String BUCKET = "chat-media";

	private final ConversationMessageMediaRepository mediaRepository;
	private final ConversationPermissions permissions;
	private final ObjectStorage objectStorage;

	public ChatMediaService(
			ConversationMessageMediaRepository mediaRepository,
			ConversationPermissions permissions,
			ObjectStorage objectStorage) {
		this.mediaRepository = mediaRepository;
		this.permissions = permissions;
		this.objectStorage = objectStorage;
	}

	@Transactional(readOnly = true)
	public ResponseEntity<byte[]> open(UUID userId, UUID conversationId, Long mediaId) {
		ConversationMessageMedia media = mediaRepository.findWithConversation(mediaId)
				.orElseThrow(ChatMediaService::missing);
		Conversation conversation = media.getMessage().getConversation();
		// Un identifiant de média d'une autre conversation ne doit pas répondre.
		if (conversation == null || !conversationId.equals(conversation.getId())) {
			throw missing();
		}
		permissions.requireAccess(conversation, userId);
		if (media.getMessage().isDeleted()) {
			throw missing();
		}

		byte[] bytes = objectStorage.read(BUCKET, media.getStoragePath());
		String filename = filenameOf(media.getStoragePath());
		MediaType type = mediaTypeOf(media.getMediaType(), filename);

		return ResponseEntity.ok()
				.contentType(type)
				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
				// Cache navigateur privé : le jeton reste requis, mais évite de re-télécharger
				// le même fichier à chaque ouverture du fil.
				.header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400")
				.header("X-Content-Type-Options", "nosniff")
				.body(bytes);
	}

	private static MediaType mediaTypeOf(String mediaType, String filename) {
		String ext = "";
		int dot = filename.lastIndexOf('.');
		if (dot >= 0) {
			ext = filename.substring(dot + 1).toLowerCase(Locale.ROOT);
		}
		return switch (ext) {
			case "png" -> MediaType.IMAGE_PNG;
			case "webp" -> MediaType.parseMediaType("image/webp");
			case "jpg", "jpeg" -> MediaType.IMAGE_JPEG;
			case "mp3" -> MediaType.parseMediaType("audio/mpeg");
			case "m4a" -> MediaType.parseMediaType("audio/mp4");
			case "ogg" -> MediaType.parseMediaType("audio/ogg");
			case "wav" -> MediaType.parseMediaType("audio/wav");
			case "webm" -> "audio".equals(mediaType)
					? MediaType.parseMediaType("audio/webm")
					: MediaType.APPLICATION_OCTET_STREAM;
			default -> "audio".equals(mediaType)
					? MediaType.parseMediaType("audio/mpeg")
					: MediaType.IMAGE_JPEG;
		};
	}

	private static String filenameOf(String storagePath) {
		if (storagePath == null || storagePath.isBlank()) {
			return "media";
		}
		int slash = Math.max(storagePath.lastIndexOf('/'), storagePath.lastIndexOf('\\'));
		String name = slash >= 0 ? storagePath.substring(slash + 1) : storagePath;
		// Le nom vient du chemin stocké (UUID). On retire les guillemets pour l'en-tête.
		return name.replace("\"", "");
	}

	private static AppException missing() {
		return new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
	}
}
