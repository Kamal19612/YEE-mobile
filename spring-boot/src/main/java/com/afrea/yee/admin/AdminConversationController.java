package com.afrea.yee.admin;

import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.conversations.ConversationService;
import com.afrea.yee.conversations.dto.ConversationResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminConversationController {

	private final ConversationService conversationService;

	public AdminConversationController(ConversationService conversationService) {
		this.conversationService = conversationService;
	}

	@GetMapping("/admin/accounts/{id}/conversations")
	public ResponseEntity<ApiResponse<List<ConversationResponse>>> list(
			@PathVariable UUID id,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "20") int perPage) {
		return ResponseEntity.ok(conversationService.adminListForUser(id, page, perPage));
	}

	@DeleteMapping("/admin/conversations/{id}")
	public ResponseEntity<ApiResponse<Map<String, String>>> delete(@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(conversationService.adminDelete(id)));
	}
}
