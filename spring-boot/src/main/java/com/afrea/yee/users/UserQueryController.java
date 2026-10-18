package com.afrea.yee.users;

import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.security.CurrentUser;
import com.afrea.yee.users.dto.CommunitySummaryResponse;
import com.afrea.yee.users.dto.UserListItemResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
public class UserQueryController {

	private final UserSearchService userSearchService;
	private final DirectoryService directoryService;
	private final CommunitySummaryService communitySummaryService;

	public UserQueryController(
			UserSearchService userSearchService,
			DirectoryService directoryService,
			CommunitySummaryService communitySummaryService) {
		this.userSearchService = userSearchService;
		this.directoryService = directoryService;
		this.communitySummaryService = communitySummaryService;
	}

	/** Effectifs de la carte communauté. Pas de nombres inventés. */
	@GetMapping("/summary")
	public ResponseEntity<ApiResponse<CommunitySummaryResponse>> summary() {
		return ResponseEntity.ok(ApiResponse.ok(
				communitySummaryService.summary(CurrentUser.id().orElse(null))));
	}

	@GetMapping("/search")
	public ResponseEntity<ApiResponse<List<UserListItemResponse>>> search(@RequestParam String q) {
		return ResponseEntity.ok(ApiResponse.ok(userSearchService.search(q)));
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<UserListItemResponse>>> directory(
			@RequestParam(required = false) String search,
			@RequestParam(required = false) UUID institutionId,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "20") int perPage) {
		int clamped = Math.min(50, Math.max(1, perPage));
		return ResponseEntity.ok(directoryService.list(
				search,
				institutionId,
				Math.max(1, page),
				clamped,
				CurrentUser.id().orElse(null)));
	}
}
