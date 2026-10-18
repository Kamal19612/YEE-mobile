package com.afrea.yee.events;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.events.dto.EventResponse;
import java.util.ArrayList;
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
@RequestMapping("/events")
public class EventController {

	private final EventService eventService;

	public EventController(EventService eventService) {
		this.eventService = eventService;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<EventResponse>>> list(
			@RequestParam(required = false) String category,
			@RequestParam(required = false) String status,
			@RequestParam(required = false) String search) {
		return ResponseEntity.ok(ApiResponse.ok(eventService.list(category, status, search)));
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<ApiResponse<EventResponse>> createJson(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(eventService.create(principal.getId(), body)));
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<EventResponse>> createMultipart(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestPart("title") String title,
			@RequestPart(value = "categoryId", required = false) String categoryId,
			@RequestPart(value = "category", required = false) String category,
			@RequestPart(value = "description", required = false) String description,
			@RequestPart(value = "locationType", required = false) String locationType,
			@RequestPart(value = "joinUrl", required = false) String joinUrl,
			@RequestPart(value = "venueAddress", required = false) String venueAddress,
			@RequestPart("startsAt") String startsAt,
			@RequestPart("endsAt") String endsAt,
			@RequestPart(value = "coverType", required = false) String coverType,
			@RequestPart(value = "videoUrl", required = false) String videoUrl,
			@RequestPart(value = "coverPhoto", required = false) MultipartFile coverPhoto) {
		String categoryRaw = categoryId != null && !categoryId.isBlank() ? categoryId : category;
		return ResponseEntity.ok(ApiResponse.ok(eventService.createMultipart(
				principal.getId(),
				title,
				categoryRaw,
				description,
				locationType,
				joinUrl,
				venueAddress,
				startsAt,
				endsAt,
				coverType,
				videoUrl,
				coverPhoto)));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<EventResponse>> get(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(eventService.get(id)));
	}

	@GetMapping("/{id}/cover")
	public ResponseEntity<ResourceRegion> cover(
			@PathVariable UUID id, @RequestHeader HttpHeaders headers) {
		return eventService.openCover(id, headers);
	}

	@PostMapping(value = "/{id}/report", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<EventResponse>> uploadReport(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestPart(value = "title", required = false) String title,
			@RequestPart("file") MultipartFile file) {
		return ResponseEntity.ok(ApiResponse.ok(eventService.uploadReport(id, principal.getId(), title, file)));
	}

	@GetMapping("/{id}/report")
	public ResponseEntity<ResourceRegion> report(
			@PathVariable UUID id, @RequestHeader HttpHeaders headers) {
		return eventService.openReport(id, headers);
	}

	@DeleteMapping("/{id}/report")
	public ResponseEntity<ApiResponse<EventResponse>> deleteReport(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(eventService.deleteReport(id, principal.getId())));
	}

	@PostMapping(value = "/{id}/visuals", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<EventResponse>> addVisuals(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestPart(value = "files", required = false) List<MultipartFile> files,
			@RequestPart(value = "file", required = false) List<MultipartFile> file,
			@RequestPart(value = "images", required = false) List<MultipartFile> images) {
		List<MultipartFile> all = new ArrayList<>();
		addNonEmpty(all, files);
		addNonEmpty(all, file);
		addNonEmpty(all, images);
		return ResponseEntity.ok(ApiResponse.ok(eventService.addVisuals(id, principal.getId(), all)));
	}

	@GetMapping("/{id}/visuals/{visualId}")
	public ResponseEntity<ResourceRegion> visual(
			@PathVariable UUID id,
			@PathVariable UUID visualId,
			@RequestHeader HttpHeaders headers) {
		return eventService.openVisual(id, visualId, headers);
	}

	@DeleteMapping("/{id}/visuals/{visualId}")
	public ResponseEntity<ApiResponse<EventResponse>> deleteVisual(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable UUID visualId) {
		return ResponseEntity.ok(ApiResponse.ok(eventService.deleteVisual(id, visualId, principal.getId())));
	}

	@PatchMapping("/{id}")
	public ResponseEntity<ApiResponse<EventResponse>> patch(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(eventService.patch(id, principal.getId(), body)));
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<ApiResponse<Map<String, String>>> delete(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		eventService.delete(id, principal.getId());
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Événement supprimé.")));
	}

	private static void addNonEmpty(List<MultipartFile> target, List<MultipartFile> source) {
		if (source == null) {
			return;
		}
		for (MultipartFile f : source) {
			if (f != null && !f.isEmpty()) {
				target.add(f);
			}
		}
	}
}
