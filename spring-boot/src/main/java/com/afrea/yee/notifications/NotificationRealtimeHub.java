package com.afrea.yee.notifications;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tools.jackson.databind.ObjectMapper;

/**
 * Hub SSE par utilisateur — pousse les nouvelles notifications aux clients connectés.
 * Les payloads sont envoyés en String JSON (évite les soucis de converters Jackson 3 / SSE).
 */
@Component
public class NotificationRealtimeHub {

	private static final Logger log = LoggerFactory.getLogger(NotificationRealtimeHub.class);
	private static final long SSE_TIMEOUT_MS = 30 * 60 * 1000L; // 30 min, le client reconnecte

	private final ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();
	private final ObjectMapper objectMapper;

	public NotificationRealtimeHub(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public SseEmitter subscribe(UUID userId) {
		SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
		CopyOnWriteArrayList<SseEmitter> list =
				emitters.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>());
		list.add(emitter);

		Runnable cleanup = () -> remove(userId, emitter);
		emitter.onCompletion(cleanup);
		emitter.onTimeout(cleanup);
		emitter.onError((ex) -> cleanup.run());

		try {
			sendJson(emitter, "connected", Map.of("ok", true));
		} catch (Exception ex) {
			cleanup.run();
		}
		return emitter;
	}

	public void publishCreated(UUID userId, long unreadCount) {
		publishCreated(userId, unreadCount, null);
	}

	/** Pousse une création de notification (+ résumé pour toast client). */
	public void publishCreated(UUID userId, long unreadCount, Map<String, Object> notification) {
		if (userId == null) {
			return;
		}
		List<SseEmitter> list = emitters.get(userId);
		if (list == null || list.isEmpty()) {
			return;
		}
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("type", "notification.created");
		payload.put("unreadCount", unreadCount);
		if (notification != null && !notification.isEmpty()) {
			payload.put("notification", notification);
		}
		for (SseEmitter emitter : List.copyOf(list)) {
			try {
				sendJson(emitter, "notification", payload);
			} catch (Exception ex) {
				dropQuietly(userId, emitter);
			}
		}
	}

	public void publishTo(UUID userId, String eventName, Map<String, Object> payload) {
		if (userId == null || eventName == null || eventName.isBlank() || payload == null) {
			return;
		}
		List<SseEmitter> list = emitters.get(userId);
		if (list == null || list.isEmpty()) {
			return;
		}
		for (SseEmitter emitter : List.copyOf(list)) {
			try {
				sendJson(emitter, eventName, payload);
			} catch (Exception ex) {
				dropQuietly(userId, emitter);
			}
		}
	}

	/** Pousse un événement à tous les clients SSE connectés (ex. post supprimé). */
	public void broadcast(String eventName, Map<String, Object> payload) {
		if (payload == null || eventName == null || eventName.isBlank()) {
			return;
		}
		emitters.forEach((userId, list) -> {
			if (list == null || list.isEmpty()) {
				return;
			}
			for (SseEmitter emitter : List.copyOf(list)) {
				try {
					sendJson(emitter, eventName, payload);
				} catch (Exception ex) {
					dropQuietly(userId, emitter);
				}
			}
		});
	}

	/** Keep-alive pour proxies / load balancers. */
	public void heartbeat() {
		emitters.forEach((userId, list) -> {
			for (SseEmitter emitter : List.copyOf(list)) {
				try {
					emitter.send(SseEmitter.event().comment("ping"));
				} catch (Exception ex) {
					dropQuietly(userId, emitter);
				}
			}
		});
	}

	private void sendJson(SseEmitter emitter, String eventName, Object payload) throws Exception {
		String json = objectMapper.writeValueAsString(payload);
		emitter.send(SseEmitter.event().name(eventName).data(json));
	}

	private void dropQuietly(UUID userId, SseEmitter emitter) {
		remove(userId, emitter);
		try {
			emitter.complete();
		} catch (Exception ignored) {
			// réponse déjà fermée / async non utilisable
		}
	}

	private void remove(UUID userId, SseEmitter emitter) {
		CopyOnWriteArrayList<SseEmitter> list = emitters.get(userId);
		if (list == null) {
			return;
		}
		list.remove(emitter);
		if (list.isEmpty()) {
			emitters.remove(userId, list);
		}
		log.trace("SSE disconnected user={}", userId);
	}
}
