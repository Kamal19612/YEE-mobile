package com.afrea.yee.sync;

import com.afrea.yee.common.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Synchro nocturne AfrEA. Désactivable via {@code app.afrea.base-url} vide
 * (le service échouera clairement) ; le cron reste déclaratif.
 */
@Component
public class AfreaSyncJob {

	private static final Logger log = LoggerFactory.getLogger(AfreaSyncJob.class);

	private final AfreaSyncService afreaSyncService;
	private final AppProperties appProperties;

	public AfreaSyncJob(AfreaSyncService afreaSyncService, AppProperties appProperties) {
		this.afreaSyncService = afreaSyncService;
		this.appProperties = appProperties;
	}

	@Scheduled(cron = "${app.afrea.sync.cron:0 0 2 * * *}")
	public void scheduledSync() {
		if (!appProperties.getAfrea().isConfigured()) {
			log.debug("AfrEA sync cron skipped: feed not configured");
			return;
		}
		try {
			SyncRunResult result = afreaSyncService.run(false);
			log.info(
					"AfrEA scheduled sync {} created={} updated={} errors={}",
					result.status(),
					result.created(),
					result.updated(),
					result.errors());
		} catch (RuntimeException ex) {
			log.warn("AfrEA scheduled sync failed: {}", ex.toString());
		}
	}
}
