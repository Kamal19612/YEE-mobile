package com.afrea.yee.feed;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.security.CurrentUser;
import com.afrea.yee.feed.dto.PostLikerResponse;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/feed")
public class ReactionController {

	private final ReactionService reactionService;

	public ReactionController(ReactionService reactionService) {
		this.reactionService = reactionService;
	}

	@GetMapping("/{id}/likes")
	public ResponseEntity<ApiResponse<List<PostLikerResponse>>> likers(
			@PathVariable Long id,
			@RequestParam(required = false) String before,
			@RequestParam(defaultValue = "20") int perPage) {
		return ResponseEntity.ok(reactionService.listLikers(
				id, parseBefore(before), perPage, CurrentUser.id().orElse(null)));
	}

	@PostMapping("/{id}/like")
	public ResponseEntity<ApiResponse<Map<String, Object>>> like(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable Long id) {
		return ResponseEntity.ok(ApiResponse.ok(reactionService.like(id, principal.getId())));
	}

	@DeleteMapping("/{id}/like")
	public ResponseEntity<ApiResponse<Map<String, Object>>> unlike(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable Long id) {
		return ResponseEntity.ok(ApiResponse.ok(reactionService.unlike(id, principal.getId())));
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
}
