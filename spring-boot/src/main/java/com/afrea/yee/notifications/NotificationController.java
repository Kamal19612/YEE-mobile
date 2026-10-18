package com.afrea.yee.notifications;

import com.afrea.yee.auth.security.UserPrincipal;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.notifications.dto.NotificationResponse;
import com.afrea.yee.notifications.dto.PushSubscribeRequest;
import com.afrea.yee.notifications.dto.PushUnsubscribeRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

	private final NotificationService notificationService;
	private final NotificationRealtimeHub realtimeHub;
	private final WebPushService webPushService;

	public NotificationController(
			NotificationService notificationService,
			NotificationRealtimeHub realtimeHub,
			WebPushService webPushService) {
		this.notificationService = notificationService;
		this.realtimeHub = realtimeHub;
		this.webPushService = webPushService;
	}

	@GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	public SseEmitter stream(@AuthenticationPrincipal UserPrincipal principal) {
		return realtimeHub.subscribe(principal.getId());
	}

	@GetMapping
	public ResponseEntity<ApiResponse<List<NotificationResponse>>> list(
			@AuthenticationPrincipal UserPrincipal principal,
			@RequestParam(required = false, defaultValue = "false") boolean unreadOnly,
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "20") int perPage) {
		return ResponseEntity.ok(notificationService.list(principal.getId(), unreadOnly, page, perPage));
	}

	@GetMapping("/unread-count")
	public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(
			@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(ApiResponse.ok(notificationService.unreadCount(principal.getId())));
	}

	@PostMapping("/{id}/read")
	public ResponseEntity<ApiResponse<Map<String, String>>> markRead(
			@AuthenticationPrincipal UserPrincipal principal,
			@PathVariable Long id) {
		return ResponseEntity.ok(ApiResponse.ok(notificationService.markRead(principal.getId(), id)));
	}

	@PostMapping("/read-all")
	public ResponseEntity<ApiResponse<Map<String, String>>> markAllRead(
			@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(ApiResponse.ok(notificationService.markAllRead(principal.getId())));
	}

	@GetMapping("/push/vapid-public-key")
	public ResponseEntity<ApiResponse<Map<String, Object>>> vapidPublicKey() {
		boolean enabled = webPushService.isEnabled();
		return ResponseEntity.ok(ApiResponse.ok(Map.of(
				"enabled", enabled,
				"publicKey", enabled ? webPushService.publicKey() : "")));
	}

	@PostMapping("/push/subscribe")
	public ResponseEntity<ApiResponse<Map<String, String>>> pushSubscribe(
			@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody PushSubscribeRequest body) {
		return ResponseEntity.ok(ApiResponse.ok(webPushService.subscribe(principal.getId(), body)));
	}

	@DeleteMapping("/push/subscribe")
	public ResponseEntity<ApiResponse<Map<String, String>>> pushUnsubscribe(
			@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody PushUnsubscribeRequest body) {
		return ResponseEntity.ok(ApiResponse.ok(webPushService.unsubscribe(principal.getId(), body.endpoint())));
	}
}
