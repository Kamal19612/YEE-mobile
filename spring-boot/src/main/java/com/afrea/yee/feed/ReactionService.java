package com.afrea.yee.feed;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.feed.dto.PostLikerResponse;
import com.afrea.yee.feed.entity.Post;
import com.afrea.yee.feed.entity.PostLike;
import com.afrea.yee.feed.repository.PostLikeRepository;
import com.afrea.yee.feed.repository.PostRepository;
import com.afrea.yee.groups.GroupFeedAccess;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
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
public class ReactionService {

	/** Borne haute typée : un Instant null casse PostgreSQL (`could not determine data type`). */
	private static final Instant LIKERS_CURSOR_UNBOUNDED = Instant.parse("9999-12-31T23:59:59Z");

	private final PostRepository postRepository;
	private final PostLikeRepository postLikeRepository;
	private final ApplicationEventPublisher events;
	private final UserTransformer userTransformer;
	private final GroupFeedAccess groupFeedAccess;

	public ReactionService(
			PostRepository postRepository,
			PostLikeRepository postLikeRepository,
			ApplicationEventPublisher events,
			UserTransformer userTransformer,
			GroupFeedAccess groupFeedAccess) {
		this.postRepository = postRepository;
		this.postLikeRepository = postLikeRepository;
		this.events = events;
		this.userTransformer = userTransformer;
		this.groupFeedAccess = groupFeedAccess;
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<PostLikerResponse>> listLikers(Long postId, Instant before, int perPage, UUID viewerId) {
		groupFeedAccess.requirePostReadable(requireActivePost(postId), viewerId);
		int limit = Math.min(50, Math.max(1, perPage));
		Instant cursor = before != null ? before : LIKERS_CURSOR_UNBOUNDED;
		List<PostLike> likes = postLikeRepository.findByPost(postId, cursor, PageRequest.of(0, limit + 1));
		boolean hasMore = likes.size() > limit;
		if (hasMore) {
			likes = likes.subList(0, limit);
		}
		List<PostLikerResponse> data = likes.stream().map(this::toLiker).toList();
		Map<String, Object> meta = new HashMap<>();
		meta.put("nextCursor", hasMore && !likes.isEmpty()
				? likes.get(likes.size() - 1).getCreatedAt().toString()
				: null);
		return ApiResponse.ok(data, meta);
	}

	@Transactional
	public Map<String, Object> like(Long postId, UUID userId) {
		Post post = requireActivePost(postId);
		groupFeedAccess.requirePostReadable(post, userId);
		if (!postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
			PostLike like = new PostLike();
			like.setPostId(postId);
			like.setUserId(userId);
			postLikeRepository.save(like);
			postRepository.bumpLikes(postId);
			UUID authorId = post.getAuthor().getId();
			if (!authorId.equals(userId)) {
				events.publishEvent(new PostLikedEvent(authorId, userId, postId));
			}
			events.publishEvent(VisibleDataChanged.feed());
		}
		return Map.of("liked", true);
	}

	@Transactional
	public Map<String, Object> unlike(Long postId, UUID userId) {
		Post post = requireActivePost(postId);
		groupFeedAccess.requirePostReadable(post, userId);
		if (postLikeRepository.existsByPostIdAndUserId(postId, userId)) {
			postLikeRepository.deleteById(new PostLike.PostLikeId(postId, userId));
			postRepository.dropLikes(postId);
			events.publishEvent(VisibleDataChanged.feed());
		}
		return Map.of("liked", false);
	}

	private Post requireActivePost(Long postId) {
		return postRepository.findActiveById(postId)
				.orElseThrow(() -> new AppException("not_found", "Publication introuvable.", HttpStatus.NOT_FOUND));
	}

	private PostLikerResponse toLiker(PostLike like) {
		User user = like.getUser();
		return new PostLikerResponse(
				user.getId().toString(),
				user.getDisplayName(),
				userTransformer.resolveAvatarUrl(user),
				user.getProfession() == null ? "" : user.getProfession(),
				like.getCreatedAt().toString());
	}
}
