package com.afrea.yee.resources;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.resources.dto.CategoryResponse;
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
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/resources/categories")
public class CategoryController {

	private final CategoryService categoryService;

	public CategoryController(CategoryService categoryService) {
		this.categoryService = categoryService;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<CategoryResponse>>> list() {
		return ResponseEntity.ok(ApiResponse.ok(categoryService.list()));
	}

	@PostMapping
	public ResponseEntity<ApiResponse<CategoryResponse>> create(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(categoryService.create(principal.getId(), body)));
	}

	@PatchMapping("/{id}")
	public ResponseEntity<ApiResponse<CategoryResponse>> patch(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(categoryService.patch(id, principal.getId(), body)));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<ApiResponse<Map<String, String>>> delete(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		categoryService.delete(id, principal.getId());
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Catégorie supprimée.")));
	}
}
