package com.afrea.yee.common.retention;

import com.afrea.yee.auth.RateLimitCounter;
import com.afrea.yee.auth.repository.RefreshTokenRepository;
import com.afrea.yee.conversations.ConversationService;
import com.afrea.yee.feed.repository.LinkPreviewRepository;
import com.afrea.yee.feed.repository.PostRepository;
import com.afrea.yee.notifications.repository.NotificationRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Purge minimale quotidienne (audit §risques — aucune purge côté PHP).
 * Les comptes anonymisés restants sont purgés au démarrage ({@code AnonymizedAccountCleanup}).
 */
@Component
public class DataRetentionJob {

	private static final Logger log = LoggerFactory.getLogger(DataRetentionJob.class);

	/** Notifications lues au-delà de 90 jours. */
	public static final int READ_NOTIFICATION_DAYS = 90;
	/** Toute notification (lue ou non) au-delà de 180 jours. */
	public static final int ALL_NOTIFICATION_DAYS = 180;
	/** Refresh tokens expirés / consommés / révoqués au-delà de 30 jours. */
	public static final int STALE_REFRESH_DAYS = 30;
	/** Messages de plus de 2 ans. */
	public static final int MESSAGE_RETENTION_DAYS = 730;

	private final NotificationRepository notificationRepository;
	private final LinkPreviewRepository linkPreviewRepository;
	private final PostRepository postRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final ConversationService conversationService;
	private final RateLimitCounter rateLimitCounter;

	public DataRetentionJob(
			NotificationRepository notificationRepository,
			LinkPreviewRepository linkPreviewRepository,
			PostRepository postRepository,
			RefreshTokenRepository refreshTokenRepository,
			ConversationService conversationService,
			RateLimitCounter rateLimitCounter) {
		this.notificationRepository = notificationRepository;
		this.linkPreviewRepository = linkPreviewRepository;
		this.postRepository = postRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.conversationService = conversationService;
		this.rateLimitCounter = rateLimitCounter;
	}

	@Scheduled(cron = "${app.retention.cron:0 30 3 * * *}")
	@Transactional
	public void run() {
		Instant now = Instant.now();
		int readNotifs = notificationRepository.deleteReadOlderThan(
				now.minus(READ_NOTIFICATION_DAYS, ChronoUnit.DAYS));
		int oldNotifs = notificationRepository.deleteOlderThan(
				now.minus(ALL_NOTIFICATION_DAYS, ChronoUnit.DAYS));
		int detached = postRepository.clearExpiredLinkPreviewRefs(now);
		int previews = linkPreviewRepository.deleteExpired(now);
		int tokens = refreshTokenRepository.deleteStale(now.minus(STALE_REFRESH_DAYS, ChronoUnit.DAYS));
		int oldMessages = conversationService.purgeOlderThan(now.minus(MESSAGE_RETENTION_DAYS, ChronoUnit.DAYS));
		int rateLimits = rateLimitCounter.purgeExpired();
		log.info(
				"Data retention: readNotifs={} oldNotifs={} detachedPreviews={} expiredPreviews={} staleRefresh={} oldMessages={} rateLimits={}",
				readNotifs, oldNotifs, detached, previews, tokens, oldMessages, rateLimits);
	}
}
