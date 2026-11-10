package com.afrea.yee.admin;

import com.afrea.yee.admin.dto.AdminCreateInstitutionsRequest;
import com.afrea.yee.admin.dto.AdminInstitutionListItemResponse;
import com.afrea.yee.common.api.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/institutions")
public class AdminInstitutionController {

	private final AdminInstitutionService adminInstitutionService;

	public AdminInstitutionController(AdminInstitutionService adminInstitutionService) {
		this.adminInstitutionService = adminInstitutionService;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<AdminInstitutionListItemResponse>>> list(
			@RequestParam(required = false) String q,
			@RequestParam(defaultValue = "PENDING") String creationStatus,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "20") int perPage) {
		int clamped = Math.min(50, Math.max(1, perPage));
		return ResponseEntity.ok(adminInstitutionService.list(
				q, creationStatus, Math.max(1, page), clamped));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<AdminInstitutionListItemResponse>> get(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(adminInstitutionService.get(id)));
	}

	@PostMapping("/create")
	public ResponseEntity<ApiResponse<Map<String, Object>>> createMany(
			@Valid @RequestBody AdminCreateInstitutionsRequest body) {
		return ResponseEntity.ok(ApiResponse.ok(adminInstitutionService.createMany(body.institutionIds())));
	}

	@PostMapping("/{id}/create")
	public ResponseEntity<ApiResponse<Map<String, Object>>> create(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(adminInstitutionService.create(id)));
	}

	@PostMapping("/{id}/reject")
	public ResponseEntity<ApiResponse<Map<String, Object>>> reject(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(adminInstitutionService.reject(id)));
	}
}
