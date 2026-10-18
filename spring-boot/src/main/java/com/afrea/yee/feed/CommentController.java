package com.afrea.yee.feed;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.security.CurrentUser;
import com.afrea.yee.feed.dto.CommentResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
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

@RestController
@RequestMapping("/feed")
public class CommentController {

	private final CommentService commentService;

	public CommentController(CommentService commentService) {
		this.commentService = commentService;
	}

	@GetMapping("/{id}/comments")
	public ResponseEntity<ApiResponse<List<CommentResponse>>> list(
			@PathVariable Long id,
			@RequestParam(required = false) Long before,
			@RequestParam(defaultValue = "20") int perPage) {
		UUID viewerId = CurrentUser.id().orElse(null);
		return ResponseEntity.ok(commentService.list(id, before, perPage, viewerId));
	}

	@PostMapping("/{id}/comments")
	public ResponseEntity<ApiResponse<CommentResponse>> create(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable Long id,
			@RequestBody Map<String, Object> body) {
		String content = body.get("content") == null ? "" : String.valueOf(body.get("content"));
		Long parentId = parseParentId(body.get("parentId"));
		return ResponseEntity.ok(ApiResponse.ok(commentService.create(id, principal.getId(), content, parentId)));
	}

	@DeleteMapping("/comments/{commentId}")
	public ResponseEntity<ApiResponse<Map<String, String>>> delete(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable Long commentId) {
		commentService.softDelete(commentId, principal.getId());
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Commentaire supprimé.")));
	}

	private static Long parseParentId(Object raw) {
		if (raw == null) {
			return null;
		}
		String value = String.valueOf(raw).trim();
		if (value.isEmpty() || "null".equalsIgnoreCase(value)) {
			return null;
		}
		try {
			return Long.valueOf(value);
		} catch (NumberFormatException ex) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("parentId", "Commentaire invalide.")));
		}
	}
}
