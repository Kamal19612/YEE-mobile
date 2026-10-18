package com.afrea.yee.users;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.security.CurrentUser;
import com.afrea.yee.groups.GroupService;
import com.afrea.yee.groups.dto.GroupResponse;
import com.afrea.yee.users.dto.ChangePasswordRequest;
import com.afrea.yee.users.dto.DeleteAccountRequest;
import com.afrea.yee.users.dto.PublicProfileResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/users")
public class ProfileController {

	private final ProfileService profileService;
	private final GroupService groupService;

	public ProfileController(ProfileService profileService, GroupService groupService) {
		this.profileService = profileService;
		this.groupService = groupService;
	}

	@GetMapping("/me")
	public ResponseEntity<ApiResponse<PublicProfileResponse>> me(
			@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(ApiResponse.ok(profileService.getMe(principal.getId())));
	}

	@PatchMapping("/me")
	public ResponseEntity<ApiResponse<PublicProfileResponse>> patchMe(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(profileService.patchMe(principal.getId(), body)));
	}

	@PutMapping("/me/password")
	public ResponseEntity<ApiResponse<Map<String, String>>> changePassword(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestBody ChangePasswordRequest body) {
		return ResponseEntity.ok(ApiResponse.ok(profileService.changePassword(principal.getId(), body)));
	}

	@PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<Map<String, String>>> uploadAvatar(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestPart(value = "file", required = false) MultipartFile file,
			@RequestPart(value = "avatar", required = false) MultipartFile avatar) {
		MultipartFile chosen = file != null && !file.isEmpty() ? file : avatar;
		return ResponseEntity.ok(ApiResponse.ok(profileService.uploadAvatar(principal.getId(), chosen)));
	}

	@PostMapping(value = "/me/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<Map<String, String>>> uploadCover(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestPart(value = "file", required = false) MultipartFile file,
			@RequestPart(value = "cover", required = false) MultipartFile cover) {
		MultipartFile chosen = file != null && !file.isEmpty() ? file : cover;
		return ResponseEntity.ok(ApiResponse.ok(profileService.uploadCover(principal.getId(), chosen)));
	}

	@GetMapping("/me/group-invites")
	public ResponseEntity<ApiResponse<List<GroupResponse>>> myGroupInvites(
			@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(ApiResponse.ok(groupService.listMyInvitations(principal.getId())));
	}

	@DeleteMapping("/me")
	public ResponseEntity<ApiResponse<Map<String, String>>> deleteMe(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestBody DeleteAccountRequest body) {
		return ResponseEntity.ok(ApiResponse.ok(profileService.deleteAccount(principal.getId(), body)));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<PublicProfileResponse>> publicProfile(@PathVariable UUID id) {
		UUID viewerId = CurrentUser.id().orElse(null);
		return ResponseEntity.ok(ApiResponse.ok(profileService.getPublic(id, viewerId)));
	}
}
