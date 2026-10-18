package com.afrea.yee.conversations;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.conversations.dto.ConversationResponse;
import com.afrea.yee.conversations.dto.ConversationSearchResponse;
import com.afrea.yee.conversations.dto.MessageResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/conversations")
public class ConversationController {

	private final ConversationService conversationService;
	private final ConversationRealtimeService realtimeService;
	private final ChatMediaService chatMediaService;

	public ConversationController(
			ConversationService conversationService,
			ConversationRealtimeService realtimeService,
			ChatMediaService chatMediaService) {
		this.conversationService = conversationService;
		this.realtimeService = realtimeService;
		this.chatMediaService = chatMediaService;
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<ConversationResponse>>> list(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "30") int perPage) {
		return ResponseEntity.ok(conversationService.listInbox(principal.getId(), page, perPage));
	}

	@GetMapping("/unread-count")
	public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(
			@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(ApiResponse.ok(conversationService.unreadCount(principal.getId())));
	}

	@GetMapping("/search")
	public ResponseEntity<ApiResponse<ConversationSearchResponse>> search(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestParam String q,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "20") int perPage) {
		return ResponseEntity.ok(ApiResponse.ok(conversationService.search(principal.getId(), q, page, perPage)));
	}

	@GetMapping("/group/{groupId}")
	public ResponseEntity<ApiResponse<ConversationResponse>> groupConversation(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID groupId) {
		return ResponseEntity.ok(ApiResponse.ok(
				conversationService.getOrCreateGroupConversation(principal.getId(), groupId)));
	}

	@GetMapping("/{id}")
	public ResponseEntity<ApiResponse<ConversationResponse>> get(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(conversationService.get(principal.getId(), id)));
	}

	@GetMapping("/{id}/messages")
	public ResponseEntity<ApiResponse<List<MessageResponse>>> messages(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "30") int perPage) {
		return ResponseEntity.ok(conversationService.listMessages(principal.getId(), id, page, perPage));
	}

	@PostMapping
	public ResponseEntity<ApiResponse<ConversationResponse>> create(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestBody JsonNode body) {
		return ResponseEntity.ok(ApiResponse.ok(conversationService.createOrGetDm(principal.getId(), body)));
	}

	@PostMapping(value = "/{id}/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<ApiResponse<MessageResponse>> sendJson(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestBody JsonNode body) {
		String content = body != null && body.has("content") ? body.get("content").asString("") : "";
		return ResponseEntity.ok(ApiResponse.ok(
				conversationService.sendMessage(principal.getId(), id, content, List.of(), null)));
	}

	@PostMapping(value = "/{id}/messages", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<ApiResponse<MessageResponse>> sendMultipart(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@RequestParam(value = "content", required = false) String content,
			@RequestParam(value = "media", required = false) List<MultipartFile> media,
			@RequestParam(value = "images", required = false) List<MultipartFile> imagesParam,
			@RequestParam(value = "image", required = false) List<MultipartFile> imageParam,
			@RequestParam(value = "audio", required = false) MultipartFile audio) {
		List<MultipartFile> images = new ArrayList<>();
		addNonEmpty(images, media);
		addNonEmpty(images, imagesParam);
		addNonEmpty(images, imageParam);
		return ResponseEntity.ok(ApiResponse.ok(
				conversationService.sendMessage(
						principal.getId(),
						id,
						content == null ? "" : content,
						images,
						audio)));
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

	@GetMapping("/{id}/media/{mediaId}")
	public ResponseEntity<byte[]> media(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable Long mediaId) {
		// Pas de JSON : octets du fichier, après contrôle du participant.
		return chatMediaService.open(principal.getId(), id, mediaId);
	}

	@PostMapping("/{id}/read")
	public ResponseEntity<ApiResponse<Map<String, String>>> read(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(conversationService.markRead(principal.getId(), id)));
	}

	@PostMapping("/{id}/typing")
	public ResponseEntity<ApiResponse<Map<String, String>>> typing(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		realtimeService.publishTyping(principal.getId(), id);
		return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "ok")));
	}

	/** Soft-delete d’un message (auteur) — visible comme tombstone pour tous. */
	@DeleteMapping("/{id}/messages/{messageId}")
	public ResponseEntity<ApiResponse<Map<String, String>>> deleteMessage(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id,
			@PathVariable Long messageId) {
		return ResponseEntity.ok(ApiResponse.ok(
				conversationService.deleteMessage(principal.getId(), id, messageId)));
	}

	/** Supprimer pour moi — masque la discussion sans la détruire pour les autres. */
	@DeleteMapping("/{id}")
	public ResponseEntity<ApiResponse<Map<String, String>>> deleteForMe(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable UUID id) {
		return ResponseEntity.ok(ApiResponse.ok(conversationService.hideForMe(principal.getId(), id)));
	}
}
