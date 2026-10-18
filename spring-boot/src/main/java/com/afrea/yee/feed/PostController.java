package com.afrea.yee.feed;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.common.security.CurrentUser;
import com.afrea.yee.feed.dto.LinkPreviewResponse;
import com.afrea.yee.feed.dto.PostLikerResponse;
import com.afrea.yee.feed.dto.PostResponse;
import com.afrea.yee.feed.entity.LinkPreview;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/feed")
public class PostController {

	private final PostService postService;
	private final LinkPreviewService linkPreviewService;
	private final ReactionService reactionService;
	private final WriteRateLimit writeRateLimit;

	public PostController(
			PostService postService,
			LinkPreviewService linkPreviewService,
			ReactionService reactionService,
			WriteRateLimit writeRateLimit) {
		this.postService = postService;
		this.linkPreviewService = linkPreviewService;
		this.reactionService = reactionService;
		this.writeRateLimit = writeRateLimit;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<PostResponse>>> list(
			@RequestParam(required = false) Long before,
			@RequestParam(defaultValue = "20") int perPage,
			@RequestParam(required = false) UUID authorId,
			@RequestParam(required = false) UUID groupId) {
		UUID viewerId = CurrentUser.id().orElse(null);
		return ResponseEntity.ok(postService.list(before, perPage, authorId, groupId, viewerId));
	}

	@GetMapping("/link-preview")
	public ResponseEntity<ApiResponse<LinkPreviewResponse>> linkPreview(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestParam String url) {
		writeRateLimit.checkLinkPreview(principal.getId());
		LinkPreview preview = linkPreviewService.resolveCached(url).orElse(null);
		return ResponseEntity.ok(ApiResponse.ok(linkPreviewService.toResponse(preview)));
	}

	@GetMapping("/{id}/likers")
	public ResponseEntity<ApiResponse<List<PostLikerResponse>>> likers(
			@PathVariable Long id,
			@RequestParam(required = false) String before,
			@RequestParam(defaultValue = "20") int perPage) {
		return ResponseEntity.ok(reactionService.listLikers(id, parseBefore(before), perPage, CurrentUser.id().orElse(null)));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<PostResponse>> get(@PathVariable Long id) {
		UUID viewerId = CurrentUser.id().orElse(null);
		return ResponseEntity.ok(ApiResponse.ok(postService.get(id, viewerId)));
	}

	@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<ApiResponse<PostResponse>> createJson(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestBody Map<String, Object> body) {
		String content = body.get("content") == null ? "" : String.valueOf(body.get("content"));
		UUID groupId = parseUuid(body.get("groupId"));
		return ResponseEntity.ok(ApiResponse.ok(
				postService.create(principal.getId(), content, groupId, List.of(), null, null)));
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<PostResponse>> createMultipart(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestParam(value = "content", required = false) String content,
			@RequestParam(value = "groupId", required = false) String groupIdRaw,
			@RequestParam(value = "media", required = false) List<MultipartFile> media,
			@RequestParam(value = "images", required = false) List<MultipartFile> imagesParam,
			@RequestParam(value = "image", required = false) List<MultipartFile> imageParam,
			@RequestParam(value = "audio", required = false) MultipartFile audio,
			@RequestParam(value = "document", required = false) MultipartFile document) {
		// @RequestParam (pas MultipartHttpServletRequest / @RequestPart texte) :
		// FormData navigateur = champs sans Content-Type → @RequestPart casse ;
		// MultipartHttpServletRequest peut ne plus être exposé après la chaîne Security.
		List<MultipartFile> images = new ArrayList<>();
		addNonEmpty(images, media);
		addNonEmpty(images, imagesParam);
		addNonEmpty(images, imageParam);
		UUID groupId = groupIdRaw == null || groupIdRaw.isBlank() ? null : UUID.fromString(groupIdRaw);
		return ResponseEntity.ok(ApiResponse.ok(
				postService.create(
						principal.getId(),
						content == null ? "" : content,
						groupId,
						images,
						audio,
						document)));
	}

	private static void addNonEmpty(List<MultipartFile> target, List<MultipartFile> source) {
		if (source == null) {
			return;
		}
		for (MultipartFile file : source) {
			if (file != null && !file.isEmpty()) {
				target.add(file);
			}
		}
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<ApiResponse<Map<String, String>>> delete(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable Long id) {
		postService.softDelete(id, principal.getId());
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Publication supprimée.")));
	}

	private static Instant parseBefore(String before) {
		if (before == null || before.isBlank()) {
			return null;
		}
		try {
			return Instant.parse(before.trim());
		} catch (DateTimeParseException ex) {
			throw new AppException("invalid_before", "Paramètre before invalide (ISO-8601).", HttpStatus.BAD_REQUEST);
		}
	}

	private static UUID parseUuid(Object raw) {
		if (raw == null) {
			return null;
		}
		String s = String.valueOf(raw).trim();
		if (s.isEmpty() || "null".equalsIgnoreCase(s)) {
			return null;
		}
		return UUID.fromString(s);
	}
}
