package com.afrea.yee.feed;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.feed.dto.PostResponse;
import com.afrea.yee.feed.entity.LinkPreview;
import com.afrea.yee.feed.entity.Post;
import com.afrea.yee.feed.entity.PostMedia;
import com.afrea.yee.feed.repository.PostLikeRepository;
import com.afrea.yee.feed.repository.PostMediaRepository;
import com.afrea.yee.feed.repository.PostRepository;
import com.afrea.yee.groups.GroupFeedAccess;
import com.afrea.yee.groups.GroupPostAuthority;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.repository.GroupRepository;
import com.afrea.yee.media.AudioSafariCompat;
import com.afrea.yee.media.AudioUploadValidator;
import com.afrea.yee.media.DocumentUploadValidator;
import com.afrea.yee.media.ImageUploadValidator;
import com.afrea.yee.media.ObjectStorage;
import com.afrea.yee.media.StoredObject;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Objects;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PostService {

	private final PostRepository postRepository;
	private final PostMediaRepository postMediaRepository;
	private final PostLikeRepository postLikeRepository;
	private final UserRepository userRepository;
	private final HtmlContentSanitizer htmlContentSanitizer;
	private final LinkPreviewService linkPreviewService;
	private final GroupPostAuthority groupPostAuthority;
	private final GroupFeedAccess groupFeedAccess;
	private final GroupRepository groupRepository;
	private final ImageUploadValidator imageUploadValidator;
	private final AudioUploadValidator audioUploadValidator;
	private final AudioSafariCompat audioSafariCompat;
	private final DocumentUploadValidator documentUploadValidator;
	private final ObjectStorage objectStorage;
	private final UserTransformer userTransformer;
	private final WriteRateLimit writeRateLimit;
	private final ApplicationEventPublisher events;

	public PostService(
			PostRepository postRepository,
			PostMediaRepository postMediaRepository,
			PostLikeRepository postLikeRepository,
			UserRepository userRepository,
			HtmlContentSanitizer htmlContentSanitizer,
			LinkPreviewService linkPreviewService,
			GroupPostAuthority groupPostAuthority,
			GroupFeedAccess groupFeedAccess,
			GroupRepository groupRepository,
			ImageUploadValidator imageUploadValidator,
			AudioUploadValidator audioUploadValidator,
			AudioSafariCompat audioSafariCompat,
			DocumentUploadValidator documentUploadValidator,
			ObjectStorage objectStorage,
			UserTransformer userTransformer,
			WriteRateLimit writeRateLimit,
			ApplicationEventPublisher events) {
		this.postRepository = postRepository;
		this.postMediaRepository = postMediaRepository;
		this.postLikeRepository = postLikeRepository;
		this.userRepository = userRepository;
		this.htmlContentSanitizer = htmlContentSanitizer;
		this.linkPreviewService = linkPreviewService;
		this.groupPostAuthority = groupPostAuthority;
		this.groupFeedAccess = groupFeedAccess;
		this.groupRepository = groupRepository;
		this.imageUploadValidator = imageUploadValidator;
		this.audioUploadValidator = audioUploadValidator;
		this.audioSafariCompat = audioSafariCompat;
		this.documentUploadValidator = documentUploadValidator;
		this.objectStorage = objectStorage;
		this.userTransformer = userTransformer;
		this.writeRateLimit = writeRateLimit;
		this.events = events;
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<PostResponse>> list(Long before, int perPage, UUID authorId, UUID groupId, UUID viewerId) {
		int limit = Math.min(50, Math.max(1, perPage));
		List<Post> posts;
		if (groupId != null) {
			// private / secret : membre actif ou admin site, sinon 404.
			groupFeedAccess.requireGroupFeed(groupId, viewerId);
			posts = postRepository.findGroupFeed(groupId, before, PageRequest.of(0, limit + 1));
		} else {
			// Le fil global ne contient jamais de posts de groupe.
			posts = postRepository.findGlobalFeed(before, authorId, PageRequest.of(0, limit + 1));
		}
		boolean hasMore = posts.size() > limit;
		if (hasMore) {
			posts = posts.subList(0, limit);
		}
		List<PostResponse> data = toResponses(posts, viewerId);
		String nextCursor = hasMore && !posts.isEmpty()
				? String.valueOf(posts.get(posts.size() - 1).getId())
				: null;
		Map<String, Object> meta = new HashMap<>();
		meta.put("nextCursor", nextCursor);
		return ApiResponse.ok(data, meta);
	}

	@Transactional(readOnly = true)
	public PostResponse get(Long id, UUID viewerId) {
		Post post = postRepository.findActiveById(id)
				.orElseThrow(() -> new AppException("not_found", "Publication introuvable.", HttpStatus.NOT_FOUND));
		// Même message si le post est dans un groupe que le visiteur ne peut pas lire.
		groupFeedAccess.requirePostReadable(post, viewerId);
		return toResponses(List.of(post), viewerId).getFirst();
	}

	@Transactional
	public PostResponse create(
			UUID authorId,
			String rawContent,
			UUID groupId,
			List<MultipartFile> images,
			MultipartFile audio,
			MultipartFile document) {
		writeRateLimit.checkCreatePost(authorId);
		User author = userRepository.findById(authorId)
				.orElseThrow(() -> new AppException("unauthorized", "Authentication required", HttpStatus.UNAUTHORIZED));

		if (groupId != null && !groupPostAuthority.canPost(authorId, groupId)) {
			throw new AppException("forbidden", "Vous ne pouvez pas publier dans ce groupe.", HttpStatus.FORBIDDEN);
		}

		List<MultipartFile> imageFiles = images == null ? List.of() : images.stream()
				.filter(f -> f != null && !f.isEmpty())
				.toList();
		boolean hasAudio = audio != null && !audio.isEmpty();
		boolean hasDocument = document != null && !document.isEmpty();
		int kinds = (imageFiles.isEmpty() ? 0 : 1) + (hasAudio ? 1 : 0) + (hasDocument ? 1 : 0);

		if (kinds > 1) {
			throw new AppException(
					"mixed_media_not_allowed",
					"Images, audio et document ne peuvent pas être mélangés.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		if (imageFiles.size() > 4) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("media", "4 images maximum.")));
		}

		String sanitized = htmlContentSanitizer.sanitize(rawContent);
		int plainLen = htmlContentSanitizer.plainLength(sanitized);
		if (plainLen > HtmlContentSanitizer.MAX_PLAIN_LENGTH) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("content", "3000 caractères maximum.")));
		}
		if (plainLen == 0 && imageFiles.isEmpty() && !hasAudio && !hasDocument) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("content", "Contenu ou média requis.")));
		}

		// Validation tout-ou-rien AVANT écriture
		List<PreparedMedia> prepared = new ArrayList<>();
		if (hasDocument) {
			DocumentUploadValidator.ValidatedDocument v = documentUploadValidator.validate(document);
			prepared.add(new PreparedMedia(
					"document", v.bytes(), v.contentType(), v.extension(), v.originalFilename(), v.byteSize()));
		} else if (hasAudio) {
			AudioUploadValidator.ValidatedAudio v =
					audioSafariCompat.ensurePlayable(audioUploadValidator.validate(audio));
			prepared.add(new PreparedMedia(
					"audio", v.bytes(), v.contentType(), v.extension(), null, (long) v.bytes().length));
		} else {
			for (MultipartFile img : imageFiles) {
				ImageUploadValidator.ValidatedImage v = imageUploadValidator.validate(img);
				prepared.add(new PreparedMedia(
						"image", v.bytes(), v.contentType(), v.extension(), null, (long) v.bytes().length));
			}
		}

		Post post = new Post();
		post.setAuthor(author);
		post.setGroupId(groupId);
		post.setContent(sanitized);

		String firstUrl = htmlContentSanitizer.firstHttpUrl(sanitized);
		if (firstUrl != null) {
			linkPreviewService.resolveCached(firstUrl).ifPresent(post::setLinkPreview);
		}

		postRepository.save(post);

		String visibility = "public";
		if (groupId != null) {
			visibility = groupRepository.findActiveById(groupId)
					.map(GroupEntity::getVisibility)
					.orElse("secret");
		}
		boolean restricted = groupId != null && !"public".equals(visibility);
		String bucket = groupId == null ? PostMediaFileService.PUBLIC_BUCKET : PostMediaFileService.bucketFor(visibility);

		int order = 0;
		for (PreparedMedia pm : prepared) {
			String path = post.getId() + "/" + UUID.randomUUID() + "." + pm.extension();
			StoredObject stored = objectStorage.upload(bucket, path, pm.bytes(), pm.contentType());
			PostMedia media = new PostMedia();
			media.setPost(post);
			media.setMediaType(pm.type());
			media.setStorageBucket(bucket);
			media.setStoragePath(stored.path());
			media.setSortOrder(order++);
			media.setOriginalFilename(pm.originalFilename());
			media.setByteSize(pm.byteSize());
			// L'id n'existe qu'après l'insert. On ne stocke pas l'URL publique
			// d'un groupe private ou secret.
			media.setUrl(restricted ? PostMediaLinks.normalizeStoredUrl("/feed/pending") : stored.publicUrl());
			postMediaRepository.saveAndFlush(media);
			if (restricted) {
				media.setUrl(PostMediaLinks.apiPath(post.getId(), media.getId()));
			}
		}

		author.setPostsCount(author.getPostsCount() + 1);
		events.publishEvent(VisibleDataChanged.feed());
		return toResponses(List.of(post), authorId).getFirst();
	}

	@Transactional
	public void softDelete(Long postId, UUID userId) {
		Post post = postRepository.findActiveById(postId)
				.orElseThrow(() -> new AppException("not_found", "Publication introuvable.", HttpStatus.NOT_FOUND));
		if (!post.getAuthor().getId().equals(userId)) {
			throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		}
		post.setDeletedAt(Instant.now());
		User author = post.getAuthor();
		author.setPostsCount(Math.max(0, author.getPostsCount() - 1));
		events.publishEvent(new PostDeletedEvent(post.getId(), author.getId(), post.getGroupId()));
	}

	private List<PostResponse> toResponses(List<Post> posts, UUID viewerId) {
		if (posts.isEmpty()) {
			return List.of();
		}
		List<Long> ids = posts.stream().map(Post::getId).toList();
		Map<Long, List<PostMedia>> mediaByPost = new HashMap<>();
		for (PostMedia m : postMediaRepository.findForPosts(ids)) {
			mediaByPost.computeIfAbsent(m.getPost().getId(), k -> new ArrayList<>()).add(m);
		}
		Set<Long> liked = viewerId == null
				? Set.of()
				: new HashSet<>(postLikeRepository.findLikedPostIds(viewerId, ids));

		Map<UUID, String> visibilityByGroup = new HashMap<>();
		List<UUID> groupIds = posts.stream().map(Post::getGroupId).filter(Objects::nonNull).distinct().toList();
		if (!groupIds.isEmpty()) {
			for (GroupEntity group : groupRepository.findActiveByIds(groupIds)) {
				visibilityByGroup.put(group.getId(), group.getVisibility());
			}
		}

		List<PostResponse> out = new ArrayList<>();
		for (Post post : posts) {
			User author = post.getAuthor();
			boolean hidePublicUrl = post.getGroupId() != null
					&& !"public".equals(visibilityByGroup.get(post.getGroupId()));
			List<PostResponse.MediaResponse> media = mediaByPost.getOrDefault(post.getId(), List.of()).stream()
					.map(m -> new PostResponse.MediaResponse(
							m.getId().toString(),
							m.getMediaType(),
							hidePublicUrl
									? PostMediaLinks.apiPath(post.getId(), m.getId())
									: PostMediaLinks.normalizeStoredUrl(m.getUrl()),
							m.getOriginalFilename(),
							m.getByteSize()))
					.toList();
			LinkPreview previewEntity = post.getLinkPreview();
			out.add(new PostResponse(
					post.getId().toString(),
					new PostResponse.AuthorResponse(
							author.getId().toString(),
							author.getDisplayName(),
							userTransformer.resolveAvatarUrl(author),
							author.getProfession() == null ? "" : author.getProfession()),
					post.getGroupId() == null ? null : post.getGroupId().toString(),
					htmlContentSanitizer.sanitize(post.getContent()),
					media,
					linkPreviewService.toResponse(previewEntity),
					post.getLikesCount(),
					post.getCommentsCount(),
					post.getCreatedAt().toString(),
					viewerId != null && liked.contains(post.getId()),
					viewerId != null && viewerId.equals(author.getId())));
		}
		return out;
	}

	private record PreparedMedia(
			String type,
			byte[] bytes,
			String contentType,
			String extension,
			String originalFilename,
			Long byteSize) {
	}
}
