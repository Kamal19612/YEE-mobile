package com.afrea.yee.admin;

import com.afrea.yee.admin.dto.AdminAccountDetailResponse;
import com.afrea.yee.admin.dto.AdminAccountListItemResponse;
import com.afrea.yee.admin.dto.AdminAccountPatchRequest;
import com.afrea.yee.admin.dto.AdminActivityItemResponse;
import com.afrea.yee.admin.dto.AdminSessionResponse;
import com.afrea.yee.auth.RefreshTokenService;
import com.afrea.yee.auth.entity.RefreshToken;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.RefreshTokenRepository;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.feed.entity.Post;
import com.afrea.yee.users.AccountDeletionService;
import com.afrea.yee.feed.entity.PostComment;
import com.afrea.yee.feed.entity.PostLike;
import com.afrea.yee.feed.repository.PostCommentRepository;
import com.afrea.yee.feed.repository.PostLikeRepository;
import com.afrea.yee.feed.repository.PostRepository;
import com.afrea.yee.groups.entity.GroupMember;
import com.afrea.yee.groups.repository.GroupMemberRepository;
import com.afrea.yee.institutions.entity.UserInstitution;
import com.afrea.yee.institutions.repository.UserInstitutionRepository;
import com.afrea.yee.users.UserTransformer;
import com.afrea.yee.users.entity.Follow;
import com.afrea.yee.users.repository.FollowRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class AdminAccountService {

	private static final Set<String> STATUS_FILTERS =
			Set.of("all", "active", "unverified", "deactivated", "admins");
	/** Bornes haute typée : évite `(:before IS NULL OR …)` qui casse PostgreSQL (param Instant null). */
	private static final Instant ACTIVITY_CURSOR_UNBOUNDED = Instant.parse("9999-12-31T23:59:59Z");
	private static final Set<String> ACTIVITY_TYPES = Set.of(
			"post", "like", "comment", "follow", "group", "institution");

	private final UserRepository userRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final RefreshTokenService refreshTokenService;
	private final UserTransformer userTransformer;
	private final PostRepository postRepository;
	private final PostLikeRepository postLikeRepository;
	private final PostCommentRepository postCommentRepository;
	private final FollowRepository followRepository;
	private final GroupMemberRepository groupMemberRepository;
	private final UserInstitutionRepository userInstitutionRepository;
	private final AccountDeletionService accountDeletionService;
	private final ObjectMapper objectMapper;

	public AdminAccountService(
			UserRepository userRepository,
			RefreshTokenRepository refreshTokenRepository,
			RefreshTokenService refreshTokenService,
			UserTransformer userTransformer,
			PostRepository postRepository,
			PostLikeRepository postLikeRepository,
			PostCommentRepository postCommentRepository,
			FollowRepository followRepository,
			GroupMemberRepository groupMemberRepository,
			UserInstitutionRepository userInstitutionRepository,
			AccountDeletionService accountDeletionService,
			ObjectMapper objectMapper) {
		this.userRepository = userRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.refreshTokenService = refreshTokenService;
		this.userTransformer = userTransformer;
		this.postRepository = postRepository;
		this.postLikeRepository = postLikeRepository;
		this.postCommentRepository = postCommentRepository;
		this.followRepository = followRepository;
		this.groupMemberRepository = groupMemberRepository;
		this.userInstitutionRepository = userInstitutionRepository;
		this.accountDeletionService = accountDeletionService;
		this.objectMapper = objectMapper;
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<AdminAccountListItemResponse>> list(String q, String status, int page, int perPage) {
		String normalizedStatus = normalizeStatus(status);
		String query = q == null ? "" : q.trim();
		PageRequest pr = PageRequest.of(Math.max(0, page - 1), perPage);
		Page<User> result = userRepository.adminSearch(query, normalizedStatus, pr);
		List<AdminAccountListItemResponse> items = result.getContent().stream()
				.map(this::toListItem)
				.toList();
		return ApiResponse.ok(items, Map.of(
				"page", page,
				"perPage", perPage,
				"total", result.getTotalElements(),
				"totalPages", result.getTotalPages()));
	}

	@Transactional(readOnly = true)
	public AdminAccountDetailResponse get(UUID userId) {
		User user = requireUser(userId);
		List<AdminSessionResponse> sessions = refreshTokenRepository.findActiveSessions(userId).stream()
				.map(this::toSession)
				.toList();
		return toDetail(user, sessions);
	}

	@Transactional
	public AdminAccountDetailResponse patch(UUID actorId, UUID userId, AdminAccountPatchRequest request) {
		if (request == null) {
			throw new AppException("bad_request", "Corps de requête manquant.", HttpStatus.BAD_REQUEST);
		}
		User user = requireUser(userId);
		if (user.isAccountDeleted()) {
			throw new AppException(
					"account_deleted",
					"Ce compte a été supprimé et ne peut plus être modifié.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		boolean changed = false;

		if (request.accountDeactivated() != null) {
			boolean next = request.accountDeactivated();
			if (next && userId.equals(actorId)) {
				throw new AppException(
						"admin_cannot_deactivate_self",
						"Vous ne pouvez pas désactiver votre propre compte administrateur.",
						HttpStatus.UNPROCESSABLE_ENTITY);
			}
			if (user.isAccountDeactivated() != next) {
				user.setAccountDeactivated(next);
				user.setDeactivatedAt(next ? Instant.now() : null);
				changed = true;
				if (next) {
					refreshTokenService.revokeAllForUser(userId);
				}
			}
		}

		if (request.siteAdmin() != null) {
			boolean next = request.siteAdmin();
			if (!next && userId.equals(actorId)) {
				throw new AppException(
						"admin_cannot_demote_self",
						"Vous ne pouvez pas retirer votre propre rôle administrateur.",
						HttpStatus.UNPROCESSABLE_ENTITY);
			}
			if (user.isSiteAdmin() != next) {
				user.setSiteAdmin(next);
				changed = true;
			}
		}

		if (request.emailVerified() != null && user.isEmailVerified() != request.emailVerified()) {
			user.setEmailVerified(request.emailVerified());
			if (request.emailVerified()) {
				user.setEmailVerificationTokenHash(null);
				user.setEmailVerificationExpiresAt(null);
			}
			changed = true;
		}

		if (!changed) {
			return get(userId);
		}
		userRepository.save(user);
		return get(userId);
	}

	@Transactional
	public Map<String, Object> revokeSessions(UUID userId) {
		requireUser(userId);
		refreshTokenService.revokeAllForUser(userId);
		return Map.of("message", "Sessions révoquées.", "userId", userId.toString());
	}

	@Transactional
	public Map<String, Object> delete(UUID actorId, UUID userId) {
		if (userId.equals(actorId)) {
			throw new AppException(
					"admin_cannot_delete_self",
					"Vous ne pouvez pas supprimer votre propre compte administrateur.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new AppException(
						"user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
		accountDeletionService.purge(user);
		return Map.of("message", "Compte supprimé.", "userId", userId.toString());
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<AdminActivityItemResponse>> activity(
			UUID userId,
			String typesCsv,
			String beforeIso,
			int limit) {
		requireUser(userId);
		int clamped = Math.min(100, Math.max(1, limit));
		Instant before = parseInstant(beforeIso);
		if (before == null) {
			before = ACTIVITY_CURSOR_UNBOUNDED;
		}
		Set<String> types = parseTypes(typesCsv);
		PageRequest slice = PageRequest.of(0, clamped);

		List<AdminActivityItemResponse> merged = new ArrayList<>();

		if (types.contains("post")) {
			for (Post post : postRepository.findByAuthorForAdmin(userId, before, slice)) {
				merged.add(new AdminActivityItemResponse(
						"post",
						String.valueOf(post.getId()),
						iso(post.getCreatedAt()),
						truncate(post.getContent(), 160),
						meta(
								"groupId", post.getGroupId() != null ? post.getGroupId().toString() : null,
								"likesCount", post.getLikesCount(),
								"commentsCount", post.getCommentsCount())));
			}
		}
		if (types.contains("like")) {
			for (PostLike like : postLikeRepository.findByUserForAdmin(userId, before, slice)) {
				merged.add(new AdminActivityItemResponse(
						"like",
						like.getPostId() + ":" + like.getUserId(),
						iso(like.getCreatedAt()),
						"A liké la publication #" + like.getPostId(),
						meta("postId", like.getPostId())));
			}
		}
		if (types.contains("comment")) {
			for (PostComment comment : postCommentRepository.findByAuthorForAdmin(userId, before, slice)) {
				merged.add(new AdminActivityItemResponse(
						"comment",
						String.valueOf(comment.getId()),
						iso(comment.getCreatedAt()),
						truncate(comment.getContent(), 160),
						meta("postId", comment.getPost() != null ? comment.getPost().getId() : null)));
			}
		}
		if (types.contains("follow")) {
			for (Follow follow : followRepository.findByFollowerForAdmin(userId, before, slice)) {
				String name = follow.getFollowee() != null ? follow.getFollowee().getDisplayName() : "?";
				UUID followeeId = follow.getFollowee() != null ? follow.getFollowee().getId() : null;
				merged.add(new AdminActivityItemResponse(
						"follow",
						String.valueOf(follow.getId()),
						iso(follow.getCreatedAt()),
						"Follow " + name,
						meta("followeeId", followeeId != null ? followeeId.toString() : null,
								"followeeName", name)));
			}
		}
		if (types.contains("group")) {
			for (GroupMember member : groupMemberRepository.findByUserForAdmin(userId, before, slice)) {
				String groupName = member.getGroup() != null ? member.getGroup().getName() : "?";
				UUID groupId = member.getGroup() != null ? member.getGroup().getId() : null;
				merged.add(new AdminActivityItemResponse(
						"group",
						String.valueOf(member.getId()),
						iso(member.getCreatedAt()),
						groupName + " · " + member.getRole() + " (" + member.getStatus() + ")",
						meta(
								"groupId", groupId != null ? groupId.toString() : null,
								"groupName", groupName,
								"role", member.getRole(),
								"status", member.getStatus())));
			}
		}
		if (types.contains("institution")) {
			for (UserInstitution ui : userInstitutionRepository.findByUserForAdmin(userId, before, slice)) {
				String instName = ui.getInstitution() != null ? ui.getInstitution().getName() : "?";
				UUID instId = ui.getInstitution() != null ? ui.getInstitution().getId() : null;
				merged.add(new AdminActivityItemResponse(
						"institution",
						String.valueOf(ui.getId()),
						iso(ui.getCreatedAt()),
						instName + " (" + ui.getStatus() + ")",
						meta(
								"institutionId", instId != null ? instId.toString() : null,
								"institutionName", instName,
								"status", ui.getStatus())));
			}
		}

		merged.sort(Comparator
				.comparing((AdminActivityItemResponse a) -> Instant.parse(a.createdAt()), Comparator.reverseOrder())
				.thenComparing(AdminActivityItemResponse::id, Comparator.reverseOrder()));

		List<AdminActivityItemResponse> page = merged.stream().limit(clamped).toList();
		String nextBefore = page.isEmpty() ? null : page.get(page.size() - 1).createdAt();
		boolean hasMore = merged.size() > page.size();

		Map<String, Object> meta = new LinkedHashMap<>();
		meta.put("limit", clamped);
		meta.put("hasMore", hasMore);
		meta.put("nextBefore", hasMore ? nextBefore : null);
		return ApiResponse.ok(page, meta);
	}

	private AdminAccountListItemResponse toListItem(User user) {
		return new AdminAccountListItemResponse(
				user.getId().toString(),
				user.getDisplayName(),
				nullToEmpty(user.getMentionName()),
				user.getEmail(),
				userTransformer.resolveAvatarUrl(user),
				nullToEmpty(user.getProfession()),
				user.isEmailVerified(),
				user.isAccountDeactivated(),
				user.isAccountDeleted(),
				user.isSiteAdmin(),
				user.getPostsCount(),
				user.getFollowersCount(),
				user.getFollowingCount(),
				iso(user.getCreatedAt()),
				iso(user.getDeactivatedAt()));
	}

	private AdminAccountDetailResponse toDetail(User user, List<AdminSessionResponse> sessions) {
		return new AdminAccountDetailResponse(
				user.getId().toString(),
				user.getDisplayName(),
				nullToEmpty(user.getMentionName()),
				user.getEmail(),
				nullToEmpty(user.getBio()),
				nullToEmpty(user.getProfession()),
				nullToEmpty(user.getOrganization()),
				nullToEmpty(user.getLocation()),
				parseSocialLinks(user.getSocialLinksJson()),
				userTransformer.resolveAvatarUrl(user),
				user.getCoverUrl(),
				user.isEmailVerified(),
				user.isAccountDeactivated(),
				user.isAccountDeleted(),
				user.isSiteAdmin(),
				user.isTwoFactorEnabled(),
				user.getPostsCount(),
				user.getFollowersCount(),
				user.getFollowingCount(),
				iso(user.getCreatedAt()),
				iso(user.getUpdatedAt()),
				iso(user.getDeactivatedAt()),
				sessions);
	}

	private AdminSessionResponse toSession(RefreshToken token) {
		return new AdminSessionResponse(
				token.getId(),
				token.getIpAddress(),
				token.getUserAgent(),
				token.isRememberMe(),
				iso(token.getCreatedAt()),
				iso(token.getExpiresAt()));
	}

	private User requireUser(UUID userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
		if (user.isAccountDeleted()) {
			throw new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND);
		}
		return user;
	}

	private static String normalizeStatus(String status) {
		String value = status == null || status.isBlank() ? "all" : status.trim().toLowerCase(Locale.ROOT);
		if (!STATUS_FILTERS.contains(value)) {
			throw new AppException(
					"invalid_status",
					"Statut invalide. Valeurs : all, active, unverified, deactivated, admins.",
					HttpStatus.BAD_REQUEST);
		}
		return value;
	}

	private static Set<String> parseTypes(String typesCsv) {
		if (typesCsv == null || typesCsv.isBlank()) {
			return ACTIVITY_TYPES;
		}
		Set<String> types = java.util.Arrays.stream(typesCsv.split(","))
				.map(s -> s.trim().toLowerCase(Locale.ROOT))
				.filter(ACTIVITY_TYPES::contains)
				.collect(Collectors.toSet());
		return types.isEmpty() ? ACTIVITY_TYPES : types;
	}

	private static Instant parseInstant(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		try {
			return Instant.parse(value);
		} catch (RuntimeException ex) {
			throw new AppException("invalid_before", "Paramètre before invalide (ISO-8601).", HttpStatus.BAD_REQUEST);
		}
	}

	private Map<String, String> parseSocialLinks(String json) {
		if (json == null || json.isBlank()) {
			return Map.of();
		}
		try {
			JsonNode node = objectMapper.readTree(json);
			Map<String, String> map = new LinkedHashMap<>();
			if (node != null && node.isObject()) {
				node.properties().forEach(entry -> {
					if (entry.getValue() != null && entry.getValue().isString()) {
						map.put(entry.getKey(), entry.getValue().asString());
					}
				});
			}
			return map;
		} catch (RuntimeException ex) {
			return Map.of();
		}
	}

	private static Map<String, Object> meta(Object... kv) {
		Map<String, Object> map = new LinkedHashMap<>();
		for (int i = 0; i + 1 < kv.length; i += 2) {
			if (kv[i + 1] != null) {
				map.put(String.valueOf(kv[i]), kv[i + 1]);
			}
		}
		return map;
	}

	private static String iso(Instant instant) {
		return instant == null ? null : instant.toString();
	}

	private static String nullToEmpty(String value) {
		return value == null ? "" : value;
	}

	private static String truncate(String value, int max) {
		if (value == null) {
			return "";
		}
		String cleaned = value.replaceAll("\\s+", " ").trim();
		if (cleaned.length() <= max) {
			return cleaned;
		}
		return cleaned.substring(0, max - 1) + "…";
	}
}
