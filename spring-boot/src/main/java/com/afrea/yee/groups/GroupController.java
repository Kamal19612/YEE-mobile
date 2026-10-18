package com.afrea.yee.groups;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.security.CurrentUser;
import com.afrea.yee.groups.dto.GroupMemberResponse;
import com.afrea.yee.groups.dto.GroupResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/groups")
public class GroupController {

	private final GroupService groupService;

	public GroupController(GroupService groupService) {
		this.groupService = groupService;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<GroupResponse>>> list(
			@RequestParam(required = false) String search,
			@RequestParam(required = false, defaultValue = "false") boolean mine,
			@RequestParam(required = false) UUID userId) {
		UUID viewerId = CurrentUser.id().orElse(null);
		return ResponseEntity.ok(groupService.list(search, mine, userId, viewerId));
	}

	@PostMapping
	public ResponseEntity<ApiResponse<GroupResponse>> create(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(groupService.create(principal.getId(), body)));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<GroupResponse>> get(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(groupService.get(id, CurrentUser.id().orElse(null))));
	}

	@PatchMapping("/{id}")
	public ResponseEntity<ApiResponse<GroupResponse>> patch(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(groupService.patch(id, principal.getId(), body)));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<ApiResponse<Map<String, String>>> delete(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		groupService.delete(id, principal.getId());
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Groupe supprimé.")));
	}

	@PostMapping("/{id}/join")
	public ResponseEntity<ApiResponse<Map<String, String>>> join(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(groupService.join(id, principal.getId())));
	}

	@DeleteMapping("/{id}/membership")
	public ResponseEntity<ApiResponse<Map<String, String>>> leave(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		groupService.leave(id, principal.getId());
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Adhésion retirée.")));
	}

	@PostMapping("/{id}/invitations")
	public ResponseEntity<ApiResponse<Map<String, String>>> invite(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody Map<String, Object> body) {
		UUID inviteeId = UUID.fromString(String.valueOf(body.get("userId")));
		return ResponseEntity.ok(ApiResponse.ok(groupService.invite(id, principal.getId(), inviteeId)));
	}

	@PostMapping("/{id}/invitations/respond")
	public ResponseEntity<ApiResponse<Map<String, String>>> respond(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody Map<String, Object> body) {
		boolean accept = Boolean.parseBoolean(String.valueOf(body.getOrDefault("accept", "false")));
		return ResponseEntity.ok(ApiResponse.ok(groupService.respondInvitation(id, principal.getId(), accept)));
	}

	@GetMapping("/{id}/members")
	public ResponseEntity<ApiResponse<List<GroupMemberResponse>>> members(
			@PathVariable UUID id,
			@RequestParam(required = false) String status) {
		return ResponseEntity.ok(groupService.listMembers(id, status, CurrentUser.id().orElse(null)));
	}

	@PostMapping("/{id}/members/{userId}/approve")
	public ResponseEntity<ApiResponse<Map<String, String>>> approve(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable UUID userId) {
		return ResponseEntity.ok(ApiResponse.ok(groupService.approve(id, principal.getId(), userId)));
	}

	@PostMapping("/{id}/members/{userId}/reject")
	public ResponseEntity<ApiResponse<Map<String, String>>> reject(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable UUID userId) {
		return ResponseEntity.ok(ApiResponse.ok(groupService.reject(id, principal.getId(), userId)));
	}

	@DeleteMapping("/{id}/members/{userId}")
	public ResponseEntity<ApiResponse<Map<String, String>>> exclude(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable UUID userId) {
		groupService.exclude(id, principal.getId(), userId);
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Membre exclu.")));
	}

	@PatchMapping("/{id}/members/{userId}/role")
	public ResponseEntity<ApiResponse<Map<String, String>>> changeRole(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable UUID userId,
			@RequestBody Map<String, Object> body) {
		String role = String.valueOf(body.getOrDefault("role", ""));
		return ResponseEntity.ok(ApiResponse.ok(groupService.changeRole(id, principal.getId(), userId, role)));
	}
}
