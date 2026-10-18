package com.afrea.yee.institutions;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.security.CurrentUser;
import com.afrea.yee.institutions.dto.AffiliationMemberResponse;
import com.afrea.yee.institutions.dto.InstitutionResponse;
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
@RequestMapping("/institutions")
public class InstitutionController {

	private final InstitutionService institutionService;

	public InstitutionController(InstitutionService institutionService) {
		this.institutionService = institutionService;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<InstitutionResponse>>> list(
			@RequestParam(required = false) UUID parentId,
			@RequestParam(required = false) String type,
			@RequestParam(required = false) String search,
			@RequestParam(required = false) UUID userId,
			@RequestParam(required = false) String status,
			@RequestParam(required = false, defaultValue = "false") boolean referentOnly) {
		UUID viewerId = CurrentUser.id().orElse(null);
		return ResponseEntity.ok(institutionService.list(
				parentId, type, search, userId, status, referentOnly, viewerId));
	}

	@PostMapping
	public ResponseEntity<ApiResponse<InstitutionResponse>> create(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(institutionService.create(principal.getId(), body)));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<InstitutionResponse>> get(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(
				institutionService.get(id, CurrentUser.id().orElse(null))));
	}

	@PatchMapping("/{id}")
	public ResponseEntity<ApiResponse<InstitutionResponse>> patch(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(institutionService.patch(id, principal.getId(), body)));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<ApiResponse<Map<String, String>>> delete(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		institutionService.delete(id, principal.getId());
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Institution supprimée.")));
	}

	@PostMapping("/{id}/affiliation")
	public ResponseEntity<ApiResponse<Map<String, String>>> requestAffiliation(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(
				institutionService.requestAffiliation(id, principal.getId())));
	}

	@DeleteMapping("/{id}/affiliation")
	public ResponseEntity<ApiResponse<Map<String, String>>> cancelAffiliation(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		institutionService.cancelAffiliation(id, principal.getId());
		return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "none", "message", "Affiliation retirée.")));
	}

	@DeleteMapping("/{id}/affiliations/{userId}")
	public ResponseEntity<ApiResponse<Map<String, String>>> excludeMember(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable UUID userId) {
		institutionService.excludeMember(id, principal.getId(), userId);
		return ResponseEntity.ok(ApiResponse.ok(Map.of("status", "none", "message", "Membre retiré.")));
	}

	@GetMapping("/{id}/affiliations")
	public ResponseEntity<ApiResponse<List<AffiliationMemberResponse>>> affiliations(
			@PathVariable UUID id,
			@RequestParam(required = false) String status) {
		return ResponseEntity.ok(institutionService.listAffiliations(id, status, CurrentUser.id().orElse(null)));
	}

	@PostMapping("/{id}/affiliations/{userId}/approve")
	public ResponseEntity<ApiResponse<Map<String, String>>> approve(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable UUID userId) {
		return ResponseEntity.ok(ApiResponse.ok(
				institutionService.approve(id, principal.getId(), userId)));
	}

	@PostMapping("/{id}/affiliations/{userId}/reject")
	public ResponseEntity<ApiResponse<Map<String, String>>> reject(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable UUID userId) {
		return ResponseEntity.ok(ApiResponse.ok(
				institutionService.reject(id, principal.getId(), userId)));
	}

	@PostMapping("/{id}/referents")
	public ResponseEntity<ApiResponse<Map<String, String>>> addReferent(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody Map<String, Object> body) {
		UUID targetUserId = UUID.fromString(String.valueOf(body.get("userId")));
		return ResponseEntity.ok(ApiResponse.ok(
				institutionService.addReferent(id, principal.getId(), targetUserId)));
	}

	@DeleteMapping("/{id}/referents/{userId}")
	public ResponseEntity<ApiResponse<Map<String, String>>> removeReferent(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable UUID userId) {
		institutionService.removeReferent(id, principal.getId(), userId);
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Référent retiré.")));
	}
}
