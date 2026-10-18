package com.afrea.yee.admin;

import com.afrea.yee.admin.dto.AdminAccountDetailResponse;
import com.afrea.yee.admin.dto.AdminAccountListItemResponse;
import com.afrea.yee.admin.dto.AdminAccountPatchRequest;
import com.afrea.yee.admin.dto.AdminActivityItemResponse;
import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
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

@RestController
@RequestMapping("/admin/accounts")
public class AdminAccountController {

	private final AdminAccountService adminAccountService;

	public AdminAccountController(AdminAccountService adminAccountService) {
		this.adminAccountService = adminAccountService;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<AdminAccountListItemResponse>>> list(
			@RequestParam(required = false) String q,
			@RequestParam(defaultValue = "all") String status,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "20") int perPage) {
		int clamped = Math.min(50, Math.max(1, perPage));
		return ResponseEntity.ok(adminAccountService.list(q, status, Math.max(1, page), clamped));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<AdminAccountDetailResponse>> get(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(adminAccountService.get(id)));
	}

	@GetMapping("/{id}/activity")
	public ResponseEntity<ApiResponse<List<AdminActivityItemResponse>>> activity(
			@PathVariable UUID id,
			@RequestParam(required = false) String types,
			@RequestParam(required = false) String before,
			@RequestParam(defaultValue = "40") int limit) {
		return ResponseEntity.ok(adminAccountService.activity(id, types, before, limit));
	}

	@PatchMapping("/{id}")
	public ResponseEntity<ApiResponse<AdminAccountDetailResponse>> patch(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody AdminAccountPatchRequest body) {
		return ResponseEntity.ok(ApiResponse.ok(adminAccountService.patch(principal.getId(), id, body)));
	}

	@PostMapping("/{id}/sessions/revoke")
	public ResponseEntity<ApiResponse<Map<String, Object>>> revokeSessions(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(adminAccountService.revokeSessions(id)));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<ApiResponse<Map<String, Object>>> delete(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(adminAccountService.delete(principal.getId(), id)));
	}
}
