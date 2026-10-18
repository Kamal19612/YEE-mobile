package com.afrea.yee.feed;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.feed.dto.CommentResponse;
import com.afrea.yee.feed.dto.PostResponse;
import com.afrea.yee.feed.entity.Post;
import com.afrea.yee.feed.entity.PostComment;
import com.afrea.yee.feed.repository.PostCommentRepository;
import com.afrea.yee.feed.repository.PostRepository;
import com.afrea.yee.groups.GroupFeedAccess;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommentService {

	private final PostCommentRepository postCommentRepository;
	private final PostRepository postRepository;
	private final UserRepository userRepository;
	private final HtmlContentSanitizer htmlContentSanitizer;
	private final UserTransformer userTransformer;
	private final ApplicationEventPublisher events;
	private final WriteRateLimit writeRateLimit;
	private final GroupFeedAccess groupFeedAccess;

	public CommentService(
			PostCommentRepository postCommentRepository,
			PostRepository postRepository,
			UserRepository userRepository,
			HtmlContentSanitizer htmlContentSanitizer,
			UserTransformer userTransformer,
			ApplicationEventPublisher events,
			WriteRateLimit writeRateLimit,
			GroupFeedAccess groupFeedAccess) {
		this.postCommentRepository = postCommentRepository;
		this.postRepository = postRepository;
		this.userRepository = userRepository;
		this.htmlContentSanitizer = htmlContentSanitizer;
		this.userTransformer = userTransformer;
		this.events = events;
		this.writeRateLimit = writeRateLimit;
		this.groupFeedAccess = groupFeedAccess;
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<CommentResponse>> list(Long postId, Long before, int perPage, UUID viewerId) {
		// Refuse la liste si le post appartient à un groupe private ou secret.
		groupFeedAccess.requirePostReadable(requireActivePost(postId), viewerId);
		int limit = Math.min(50, Math.max(1, perPage));
		List<PostComment> roots = postCommentRepository.findRootsByPost(postId, before, PageRequest.of(0, limit + 1));
		boolean hasMore = roots.size() > limit;
		if (hasMore) {
			roots = roots.subList(0, limit);
		}

		Map<Long, List<PostComment>> repliesByParent = new HashMap<>();
		if (!roots.isEmpty()) {
			List<Long> rootIds = roots.stream().map(PostComment::getId).toList();
			for (PostComment reply : postCommentRepository.findRepliesByParentIds(rootIds)) {
				repliesByParent.computeIfAbsent(reply.getParent().getId(), ignored -> new ArrayList<>())
						.add(reply);
			}
		}

		List<CommentResponse> data = roots.stream().map(root -> {
			String rootName = root.getAuthor() == null ? null : root.getAuthor().getDisplayName();
			List<CommentResponse> replies = repliesByParent.getOrDefault(root.getId(), List.of()).stream()
					.map(reply -> toResponse(reply, viewerId, postId, root.getId(), rootName, List.of()))
					.toList();
			return toResponse(root, viewerId, postId, null, null, replies);
		}).toList();

		Map<String, Object> meta = new HashMap<>();
		meta.put("nextCursor", hasMore && !roots.isEmpty()
				? String.valueOf(roots.get(roots.size() - 1).getId())
				: null);
		return ApiResponse.ok(data, meta);
	}

	@Transactional
	public CommentResponse create(Long postId, UUID authorId, String rawContent, Long parentId) {
		writeRateLimit.checkCreateComment(authorId);
		Post post = requireActivePost(postId);
		// Un non-membre ne peut pas commenter un post de groupe fermé.
		groupFeedAccess.requirePostReadable(post, authorId);
		User author = userRepository.findById(authorId)
				.orElseThrow(() -> new AppException("unauthorized", "Authentication required", HttpStatus.UNAUTHORIZED));

		String sanitized = htmlContentSanitizer.sanitize(rawContent);
		int plain = htmlContentSanitizer.plainLength(sanitized);
		if (plain == 0 || plain > HtmlContentSanitizer.MAX_PLAIN_LENGTH) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("content", "Commentaire invalide.")));
		}

		PostComment parent = resolveParent(postId, parentId);

		PostComment comment = new PostComment();
		comment.setPost(post);
		comment.setAuthor(author);
		comment.setParent(parent);
		comment.setContent(sanitized);
		postCommentRepository.save(comment);
		postRepository.bumpComments(postId);

		publishCommentEvents(post, authorId, parent, comment.getId());
		events.publishEvent(VisibleDataChanged.feed());
		Long resolvedParentId = parent == null ? null : parent.getId();
		String replyToName = parent == null || parent.getAuthor() == null
				? null
				: parent.getAuthor().getDisplayName();
		return toResponse(comment, authorId, postId, resolvedParentId, replyToName, List.of());
	}

	@Transactional
	public void softDelete(Long commentId, UUID userId) {
		PostComment comment = postCommentRepository.findActiveById(commentId)
				.orElseThrow(() -> new AppException("not_found", "Commentaire introuvable.", HttpStatus.NOT_FOUND));
		if (!comment.getAuthor().getId().equals(userId)) {
			throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		}
		Instant now = Instant.now();
		comment.setDeletedAt(now);
		int removed = 1;
		if (comment.getParent() == null) {
			List<PostComment> replies = postCommentRepository.findActiveReplies(comment.getId());
			for (PostComment reply : replies) {
				reply.setDeletedAt(now);
			}
			removed += replies.size();
		}
		postRepository.dropCommentsBy(comment.getPost().getId(), removed);
		events.publishEvent(VisibleDataChanged.feed());
	}

	private Post requireActivePost(Long postId) {
		return postRepository.findActiveById(postId)
				.orElseThrow(() -> new AppException("not_found", "Publication introuvable.", HttpStatus.NOT_FOUND));
	}

	private PostComment resolveParent(Long postId, Long parentId) {
		if (parentId == null) {
			return null;
		}
		PostComment parent = postCommentRepository.findActiveById(parentId)
				.orElseThrow(() -> new AppException("not_found", "Commentaire introuvable.", HttpStatus.NOT_FOUND));
		if (!parent.getPost().getId().equals(postId)) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("parentId", "Commentaire invalide.")));
		}
		if (parent.getParent() != null) {
			return parent.getParent();
		}
		return parent;
	}

	private void publishCommentEvents(Post post, UUID authorId, PostComment parent, Long commentId) {
		UUID postAuthorId = post.getAuthor().getId();
		UUID parentAuthorId = parent == null ? null : parent.getAuthor().getId();
		if (parentAuthorId != null && !parentAuthorId.equals(authorId)) {
			events.publishEvent(new CommentRepliedEvent(parentAuthorId, authorId, post.getId(), commentId));
		}
		if (!postAuthorId.equals(authorId) && (parentAuthorId == null || !postAuthorId.equals(parentAuthorId))) {
			events.publishEvent(new PostCommentedEvent(postAuthorId, authorId, post.getId(), commentId));
		}
	}

	private CommentResponse toResponse(
			PostComment comment,
			UUID viewerId,
			Long postId,
			Long parentId,
			String replyToName,
			List<CommentResponse> replies) {
		User author = comment.getAuthor();
		return new CommentResponse(
				comment.getId().toString(),
				postId.toString(),
				new PostResponse.AuthorResponse(
						author.getId().toString(),
						author.getDisplayName(),
						userTransformer.resolveAvatarUrl(author),
						author.getProfession() == null ? "" : author.getProfession()),
				htmlContentSanitizer.sanitize(comment.getContent()),
				comment.getCreatedAt().toString(),
				viewerId != null && viewerId.equals(author.getId()),
				parentId == null ? null : parentId.toString(),
				replyToName == null || replyToName.isBlank() ? null : replyToName,
				replies == null ? List.of() : replies);
	}
}
