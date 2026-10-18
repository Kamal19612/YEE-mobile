package com.afrea.yee.feed;

import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.feed.entity.Post;
import com.afrea.yee.feed.entity.PostMedia;
import com.afrea.yee.feed.repository.PostMediaRepository;
import com.afrea.yee.groups.GroupFeedAccess;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.repository.GroupRepository;
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
 * Sert les fichiers de publication.
 * Le fil global et les groupes public passent par {@code /media/post-media}.
 * Un groupe private ou secret passe par {@code /feed/{postId}/media/{id}},
 * après le même contrôle que le JSON du post.
 */
@Service
public class PostMediaFileService {

	public static final String PUBLIC_BUCKET = "post-media";
	public static final String GROUP_BUCKET = "group-post-media";

	private final PostMediaRepository mediaRepository;
	private final GroupRepository groupRepository;
	private final GroupFeedAccess groupFeedAccess;
	private final ObjectStorage objectStorage;

	public PostMediaFileService(
			PostMediaRepository mediaRepository,
			GroupRepository groupRepository,
			GroupFeedAccess groupFeedAccess,
			ObjectStorage objectStorage) {
		this.mediaRepository = mediaRepository;
		this.groupRepository = groupRepository;
		this.groupFeedAccess = groupFeedAccess;
		this.objectStorage = objectStorage;
	}

	@Transactional(readOnly = true)
	public ResponseEntity<byte[]> open(UUID viewerId, long postId, long mediaId) {
		PostMedia media = mediaRepository.findWithPost(mediaId).orElseThrow(PostMediaFileService::missing);
		Post post = media.getPost();
		if (post == null || post.getId() == null || post.getId() != postId || post.getDeletedAt() != null) {
			throw missing();
		}
		groupFeedAccess.requirePostReadable(post, viewerId);
		return bytes(media, privateCache(post));
	}

	/**
	 * Ancienne URL publique. Refusée dès que le groupe n'est pas public,
	 * même si le fichier est encore dans le bucket post-media.
	 */
	@Transactional(readOnly = true)
	public ResponseEntity<byte[]> openPublic(long postId, String filename) {
		if (!safeFilename(filename)) {
			throw missing();
		}
		String path = postId + "/" + filename;
		PostMedia media = mediaRepository.findByPostAndPath(postId, path).orElseThrow(PostMediaFileService::missing);
		Post post = media.getPost();
		if (post == null || post.getDeletedAt() != null) {
			throw missing();
		}
		if (!PUBLIC_BUCKET.equals(media.getStorageBucket())) {
			throw missing();
		}
		if (post.getGroupId() != null) {
			GroupEntity group = groupRepository.findActiveById(post.getGroupId()).orElse(null);
			if (group == null || !"public".equals(group.getVisibility())) {
				throw missing();
			}
		}
		return bytes(media, false);
	}

	public static String bucketFor(String visibility) {
		return "public".equals(visibility) ? PUBLIC_BUCKET : GROUP_BUCKET;
	}

	private boolean privateCache(Post post) {
		if (post.getGroupId() == null) {
			return false;
		}
		GroupEntity group = groupRepository.findActiveById(post.getGroupId()).orElse(null);
		return group == null || !"public".equals(group.getVisibility());
	}

	private ResponseEntity<byte[]> bytes(PostMedia media, boolean restricted) {
		String bucket = media.getStorageBucket() == null || media.getStorageBucket().isBlank()
				? PUBLIC_BUCKET
				: media.getStorageBucket();
		byte[] body = objectStorage.read(bucket, media.getStoragePath());
		String filename = downloadFilename(media);
		MediaType contentType = mediaTypeOf(media.getMediaType(), filename);
		return ResponseEntity.ok()
				.contentType(contentType)
				.contentLength(body.length)
				.header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(filename))
				.header(HttpHeaders.CACHE_CONTROL, restricted ? "private, no-store" : "public, max-age=86400")
				.header("X-Content-Type-Options", "nosniff")
				.body(body);
	}

	private static String downloadFilename(PostMedia media) {
		String original = media.getOriginalFilename();
		if (original != null && !original.isBlank()) {
			return original.replace("\"", "").replace("\r", "").replace("\n", "");
		}
		return filenameOf(media.getStoragePath());
	}

	private static String contentDisposition(String filename) {
		String ascii = filename.replaceAll("[^\\x20-\\x7E]", "_").replace("\"", "");
		if (ascii.isBlank()) {
			ascii = "file";
		}
		return "inline; filename=\"" + ascii + "\"";
	}

	private static boolean safeFilename(String filename) {
		return filename != null
				&& !filename.isBlank()
				&& !filename.contains("..")
				&& !filename.contains("/")
				&& !filename.contains("\\");
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
			case "pdf" -> MediaType.APPLICATION_PDF;
			case "webm" -> "audio".equals(mediaType)
					? MediaType.parseMediaType("audio/webm")
					: MediaType.APPLICATION_OCTET_STREAM;
			default -> {
				if ("document".equals(mediaType)) {
					yield MediaType.APPLICATION_PDF;
				}
				if ("audio".equals(mediaType)) {
					yield MediaType.parseMediaType("audio/mpeg");
				}
				yield MediaType.IMAGE_JPEG;
			}
		};
	}

	private static String filenameOf(String storagePath) {
		if (storagePath == null || storagePath.isBlank()) {
			return "media";
		}
		int slash = Math.max(storagePath.lastIndexOf('/'), storagePath.lastIndexOf('\\'));
		String name = slash >= 0 ? storagePath.substring(slash + 1) : storagePath;
		return name.replace("\"", "");
	}

	private static AppException missing() {
		return new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
	}
}
