package com.afrea.yee.users;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.security.CurrentUser;
import com.afrea.yee.users.dto.UserListItemResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class FollowController {

	private final FollowService followService;

	public FollowController(FollowService followService) {
		this.followService = followService;
	}

	@PostMapping("/{id}/follow")
	public ResponseEntity<ApiResponse<Map<String, Boolean>>> follow(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(followService.follow(principal.getId(), id)));
	}

	@DeleteMapping("/{id}/follow")
	public ResponseEntity<ApiResponse<Map<String, Boolean>>> unfollow(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(followService.unfollow(principal.getId(), id)));
	}

	@GetMapping("/{id}/follow")
	public ResponseEntity<ApiResponse<Map<String, Boolean>>> followStatus(@PathVariable UUID id) {
		UUID viewerId = CurrentUser.id().orElse(null);
		return ResponseEntity.ok(ApiResponse.ok(followService.followStatus(viewerId, id)));
	}

	@GetMapping("/{id}/followers")
	public ResponseEntity<ApiResponse<List<UserListItemResponse>>> followers(
			@PathVariable UUID id,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "20") int perPage) {
		return ResponseEntity.ok(followService.listFollowers(id, page, clamp(perPage)));
	}

	@GetMapping("/{id}/following")
	public ResponseEntity<ApiResponse<List<UserListItemResponse>>> following(
			@PathVariable UUID id,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "20") int perPage) {
		return ResponseEntity.ok(followService.listFollowing(id, page, clamp(perPage)));
	}

	private static int clamp(int perPage) {
		return Math.min(50, Math.max(1, perPage));
	}
}
