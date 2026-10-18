package com.afrea.yee.users;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.users.dto.UserListItemResponse;
import com.afrea.yee.users.repository.FollowRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FollowService {

	private final FollowRepository followRepository;
	private final UserRepository userRepository;
	private final UserTransformer userTransformer;
	private final ApplicationEventPublisher events;

	public FollowService(
			FollowRepository followRepository,
			UserRepository userRepository,
			UserTransformer userTransformer,
			ApplicationEventPublisher events) {
		this.followRepository = followRepository;
		this.userRepository = userRepository;
		this.userTransformer = userTransformer;
		this.events = events;
	}

	@Transactional(readOnly = true)
	public boolean isFollowing(UUID followerId, UUID followeeId) {
		if (followerId == null || followeeId == null || followerId.equals(followeeId)) {
			return false;
		}
		return followRepository.existsByFollowerIdAndFolloweeId(followerId, followeeId);
	}

	@Transactional
	public Map<String, Boolean> follow(UUID followerId, UUID followeeId) {
		if (followerId.equals(followeeId)) {
			throw new AppException("cannot_follow_self", "Vous ne pouvez pas vous follow vous-même.", HttpStatus.BAD_REQUEST);
		}
		requireActiveUser(followeeId);

		int inserted = followRepository.insertIgnore(followerId, followeeId);
		if (inserted > 0) {
			userRepository.bumpFollowing(followerId, 1);
			userRepository.bumpFollowers(followeeId, 1);
			events.publishEvent(new UserFollowedEvent(followeeId, followerId));
			events.publishEvent(VisibleDataChanged.members());
		}
		return Map.of("following", true);
	}

	@Transactional
	public Map<String, Boolean> unfollow(UUID followerId, UUID followeeId) {
		int deleted = followRepository.deleteByFollowerAndFollowee(followerId, followeeId);
		if (deleted > 0) {
			userRepository.adjustFollowing(followerId, -1);
			userRepository.adjustFollowers(followeeId, -1);
			events.publishEvent(VisibleDataChanged.members());
		}
		return Map.of("following", false);
	}

	@Transactional(readOnly = true)
	public Map<String, Boolean> followStatus(UUID followerId, UUID followeeId) {
		requireActiveUser(followeeId);
		return Map.of("following", isFollowing(followerId, followeeId));
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<UserListItemResponse>> listFollowers(UUID userId, int page, int perPage) {
		requireActiveUser(userId);
		PageRequest pr = PageRequest.of(Math.max(0, page - 1), perPage);
		List<UUID> ids = followRepository.findFollowerIds(userId, pr);
		List<UserListItemResponse> items = userRepository.findAllById(ids).stream()
				.filter(u -> !u.isAccountDeactivated() && !u.isAccountDeleted())
				.map(userTransformer::toListItem)
				.toList();
		return ApiResponse.ok(items, Map.of("page", page, "perPage", perPage));
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<UserListItemResponse>> listFollowing(UUID userId, int page, int perPage) {
		requireActiveUser(userId);
		PageRequest pr = PageRequest.of(Math.max(0, page - 1), perPage);
		List<UUID> ids = followRepository.findFolloweeIds(userId, pr);
		List<UserListItemResponse> items = userRepository.findAllById(ids).stream()
				.filter(u -> !u.isAccountDeactivated() && !u.isAccountDeleted())
				.map(userTransformer::toListItem)
				.toList();
		return ApiResponse.ok(items, Map.of("page", page, "perPage", perPage));
	}

	private User requireActiveUser(UUID userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
		if (user.isAccountDeactivated() || user.isAccountDeleted()) {
			throw new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND);
		}
		return user;
	}
}
