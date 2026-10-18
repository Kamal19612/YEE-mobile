package com.afrea.yee.users;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.institutions.repository.UserInstitutionRepository;
import com.afrea.yee.users.dto.UserListItemResponse;
import com.afrea.yee.users.repository.FollowRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DirectoryService {

	private final UserRepository userRepository;
	private final UserTransformer userTransformer;
	private final UserInstitutionRepository userInstitutionRepository;
	private final InstitutionRepository institutionRepository;
	private final FollowRepository followRepository;

	public DirectoryService(
			UserRepository userRepository,
			UserTransformer userTransformer,
			UserInstitutionRepository userInstitutionRepository,
			InstitutionRepository institutionRepository,
			FollowRepository followRepository) {
		this.userRepository = userRepository;
		this.userTransformer = userTransformer;
		this.userInstitutionRepository = userInstitutionRepository;
		this.institutionRepository = institutionRepository;
		this.followRepository = followRepository;
	}

	/**
	 * Annuaire public. Filtre institutionId : affiliations actives du nœud et de ses descendants.
	 */
	@Transactional(readOnly = true)
	public ApiResponse<List<UserListItemResponse>> list(
			String search,
			UUID institutionId,
			int page,
			int perPage,
			UUID viewerId) {
		PageRequest pr = PageRequest.of(Math.max(0, page - 1), perPage);

		if (institutionId != null) {
			List<UUID> scope = institutionRepository.findDescendantIdsIncludingSelf(institutionId);
			if (scope.isEmpty()) {
				return ApiResponse.ok(List.of(), Map.of(
						"page", page,
						"perPage", perPage,
						"total", 0,
						"totalPages", 0));
			}
			Page<UUID> userIds = userInstitutionRepository.findActiveMemberUserIdsIn(scope, search, pr);
			List<User> users = userRepository.findAllById(userIds.getContent());
			Map<UUID, User> byId = users.stream().collect(java.util.stream.Collectors.toMap(User::getId, u -> u));
			Set<UUID> following = followingSet(viewerId, userIds.getContent());
			List<UserListItemResponse> items = userIds.getContent().stream()
					.map(byId::get)
					.filter(u -> u != null && !u.isAccountDeleted())
					.map(u -> userTransformer.toListItem(u, following.contains(u.getId())))
					.toList();
			return ApiResponse.ok(items, Map.of(
					"page", page,
					"perPage", perPage,
					"total", userIds.getTotalElements(),
					"totalPages", userIds.getTotalPages()));
		}

		Page<User> result = userRepository.directory(search, pr);
		Set<UUID> following = followingSet(
				viewerId,
				result.getContent().stream().map(User::getId).toList());
		List<UserListItemResponse> items = result.getContent().stream()
				.map(u -> userTransformer.toListItem(u, following.contains(u.getId())))
				.toList();
		return ApiResponse.ok(items, Map.of(
				"page", page,
				"perPage", perPage,
				"total", result.getTotalElements(),
				"totalPages", result.getTotalPages()));
	}

	private Set<UUID> followingSet(UUID viewerId, List<UUID> ids) {
		if (viewerId == null || ids == null || ids.isEmpty()) {
			return Set.of();
		}
		return new HashSet<>(followRepository.findFolloweeIdsIn(viewerId, ids));
	}
}
