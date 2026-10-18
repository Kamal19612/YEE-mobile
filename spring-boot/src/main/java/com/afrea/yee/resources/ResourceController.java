package com.afrea.yee.resources;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.resources.dto.ResourceResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/resources")
public class ResourceController {

	private final ResourceService resourceService;

	public ResourceController(ResourceService resourceService) {
		this.resourceService = resourceService;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<ResourceResponse>>> list(
			@RequestParam(required = false) String category,
			@RequestParam(required = false) String language,
			@RequestParam(required = false) String search) {
		return ResponseEntity.ok(ApiResponse.ok(resourceService.list(category, language, search)));
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<ResourceResponse>> create(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestPart("title") String title,
			@RequestPart(value = "categoryId", required = false) String categoryId,
			@RequestPart(value = "category", required = false) String category,
			@RequestPart("language") String language,
			@RequestPart(value = "description", required = false) String description,
			@RequestPart("file") MultipartFile file) {
		String categoryRaw = categoryId != null && !categoryId.isBlank() ? categoryId : category;
		return ResponseEntity.ok(ApiResponse.ok(
				resourceService.create(principal.getId(), title, categoryRaw, language, description, file)));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<ResourceResponse>> get(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(resourceService.get(id)));
	}

	@GetMapping("/{id}/file")
	public ResponseEntity<ResourceRegion> file(
			@PathVariable UUID id, @RequestHeader HttpHeaders headers) {
		return resourceService.openFile(id, headers);
	}

	@GetMapping("/{id}/cover")
	public ResponseEntity<ResourceRegion> cover(
			@PathVariable UUID id, @RequestHeader HttpHeaders headers) {
		return resourceService.openCover(id, headers);
	}

	@PatchMapping("/{id}")
	public ResponseEntity<ApiResponse<ResourceResponse>> patch(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(resourceService.patch(id, principal.getId(), body)));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<ApiResponse<Map<String, String>>> delete(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		resourceService.delete(id, principal.getId());
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Ressource supprimée.")));
	}
}
