package com.afrea.yee.notifications;

import com.afrea.yee.common.config.AppProperties;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.notifications.dto.PushSubscribeRequest;
import com.afrea.yee.notifications.entity.PushSubscription;
import com.afrea.yee.notifications.repository.PushSubscriptionRepository;
import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.jose4j.lang.JoseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@Service
public class WebPushService {

	private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

	private final PushSubscriptionRepository subscriptionRepository;
	private final AppProperties appProperties;
	private final ObjectMapper objectMapper;
	private final TransactionTemplate transactionTemplate;
	private final ExecutorService pushExecutor = Executors.newFixedThreadPool(2, r -> {
		Thread t = new Thread(r, "web-push");
		t.setDaemon(true);
		return t;
	});

	private volatile PushService pushService;
	private volatile boolean providerReady;

	public WebPushService(
			PushSubscriptionRepository subscriptionRepository,
			AppProperties appProperties,
			ObjectMapper objectMapper,
			PlatformTransactionManager transactionManager) {
		this.subscriptionRepository = subscriptionRepository;
		this.appProperties = appProperties;
		this.objectMapper = objectMapper;
		this.transactionTemplate = new TransactionTemplate(transactionManager);
	}

	public boolean isEnabled() {
		AppProperties.Vapid vapid = appProperties.getVapid();
		return vapid.getPublicKey() != null
				&& !vapid.getPublicKey().isBlank()
				&& vapid.getPrivateKey() != null
				&& !vapid.getPrivateKey().isBlank();
	}

	public String publicKey() {
		return isEnabled() ? appProperties.getVapid().getPublicKey().trim() : "";
	}

	@Transactional
	public Map<String, String> subscribe(UUID userId, PushSubscribeRequest request) {
		ensureEnabled();
		String endpoint = request.endpoint().trim();
		String p256dh = request.keys().p256dh().trim();
		String auth = request.keys().auth().trim();
		if (endpoint.isEmpty() || p256dh.isEmpty() || auth.isEmpty()) {
			throw new AppException("validation_error", "Abonnement push invalide.", HttpStatus.BAD_REQUEST);
		}

		PushSubscription sub = subscriptionRepository.findByEndpoint(endpoint).orElseGet(PushSubscription::new);
		sub.setUserId(userId);
		sub.setEndpoint(endpoint);
		sub.setP256dh(p256dh);
		sub.setAuth(auth);
		if (request.userAgent() != null && !request.userAgent().isBlank()) {
			sub.setUserAgent(request.userAgent().trim());
		}
		subscriptionRepository.save(sub);
		return Map.of("message", "ok");
	}

	@Transactional
	public Map<String, String> unsubscribe(UUID userId, String endpoint) {
		if (endpoint == null || endpoint.isBlank()) {
			throw new AppException("validation_error", "Endpoint requis.", HttpStatus.BAD_REQUEST);
		}
		subscriptionRepository.deleteByUserIdAndEndpoint(userId, endpoint.trim());
		return Map.of("message", "ok");
	}

	/** Envoi asynchrone — ne bloque pas le chemin SSE / transaction. */
	public void sendNotificationPushAsync(UUID userId, Map<String, Object> summary, long unreadCount) {
		if (!isEnabled() || userId == null) {
			return;
		}
		Map<String, Object> payload = PushPayloadBuilder.fromNotificationSummary(summary, unreadCount);
		pushExecutor.execute(() -> sendToUser(userId, payload));
	}

	public void sendMessagePushAsync(
			UUID userId,
			String conversationId,
			String messageId,
			String senderName,
			String preview,
			boolean hasMedia) {
		if (!isEnabled() || userId == null) {
			return;
		}
		Map<String, Object> payload =
				PushPayloadBuilder.fromMessage(conversationId, messageId, senderName, preview, hasMedia);
		pushExecutor.execute(() -> sendToUser(userId, payload));
	}

	private void sendToUser(UUID userId, Map<String, Object> payload) {
		List<PushSubscription> subs = transactionTemplate.execute(
				status -> subscriptionRepository.findByUserId(userId));
		if (subs == null || subs.isEmpty()) {
			return;
		}
		String json;
		try {
			json = objectMapper.writeValueAsString(payload);
		} catch (Exception ex) {
			log.warn("Web Push payload serialize failed: {}", ex.toString());
			return;
		}
		PushService service;
		try {
			service = getOrCreatePushService();
		} catch (Exception ex) {
			log.warn("Web Push service init failed: {}", ex.toString());
			return;
		}
		for (PushSubscription sub : subs) {
			try {
				Notification notification = new Notification(
						sub.getEndpoint(),
						sub.getP256dh(),
						sub.getAuth(),
						json);
				var response = service.send(notification);
				int status = response.getStatusLine().getStatusCode();
				if (status == 404 || status == 410) {
					transactionTemplate.executeWithoutResult(
							statusTx -> subscriptionRepository.deleteByEndpoint(sub.getEndpoint()));
					log.info("Removed stale push subscription for user {}", userId);
				} else if (status >= 400) {
					log.warn("Web Push HTTP {} for user {}", status, userId);
				}
			} catch (GeneralSecurityException | JoseException | java.io.IOException | InterruptedException ex) {
				log.warn("Web Push send failed user={}: {}", userId, ex.toString());
				if (ex instanceof InterruptedException) {
					Thread.currentThread().interrupt();
				}
			} catch (Exception ex) {
				log.warn("Web Push send unexpected user={}: {}", userId, ex.toString());
			}
		}
	}

	private void ensureEnabled() {
		if (!isEnabled()) {
			throw new AppException(
					"push_disabled",
					"Les notifications push ne sont pas configurées (clés VAPID manquantes).",
					HttpStatus.SERVICE_UNAVAILABLE);
		}
	}

	private PushService getOrCreatePushService() throws GeneralSecurityException {
		PushService existing = pushService;
		if (existing != null) {
			return existing;
		}
		synchronized (this) {
			if (pushService != null) {
				return pushService;
			}
			ensureProvider();
			AppProperties.Vapid vapid = appProperties.getVapid();
			String subject = vapid.getSubject();
			if (subject == null || subject.isBlank()) {
				subject = "mailto:noreply@yee.local";
			}
			// Constructeur String + String + subject (clés VAPID base64url)
			PushService created = new PushService(
					vapid.getPublicKey().trim(),
					vapid.getPrivateKey().trim(),
					subject.trim());
			pushService = created;
			return created;
		}
	}

	private void ensureProvider() {
		if (providerReady) {
			return;
		}
		if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
			Security.addProvider(new BouncyCastleProvider());
		}
		providerReady = true;
	}
}
