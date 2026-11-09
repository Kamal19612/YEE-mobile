package com.afrea.yee.sync.afrea;

import com.afrea.yee.common.config.AppProperties;
import com.afrea.yee.sync.afrea.dto.AfreaFeedPageDto;
import com.afrea.yee.sync.afrea.dto.AfreaIdsResponseDto;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Client read-only du feed AfrEA ({@code /aed-feed/}).
 * Pagination {@code after}, delta {@code updated_since}, réconciliation {@code ids=1}.
 * Aucune donnée personnelle n'est loguée en clair.
 */
@Component
public class AfreaFeedClient {

	private static final Logger log = LoggerFactory.getLogger(AfreaFeedClient.class);
	private static final int MAX_PAGES = 10_000;

	private final RestClient restClient;
	private final AppProperties appProperties;

	public AfreaFeedClient(
			@Qualifier(AfreaFeedClientConfig.REST_CLIENT_BEAN) RestClient restClient,
			AppProperties appProperties) {
		this.restClient = restClient;
		this.appProperties = appProperties;
	}

	public AfreaFeedPageDto fetchPage(String after, Instant updatedSince) {
		requireConfigured();
		Map<String, String> query = new LinkedHashMap<>();
		if (after != null && !after.isBlank()) {
			query.put("after", after);
		}
		if (updatedSince != null) {
			query.put("updated_since", updatedSince.toString());
		}
		return get("", query, AfreaFeedPageDto.class);
	}

	/**
	 * Parcourt toutes les pages. Les institutions sont en général sur la 1ʳᵉ page
	 * (contrat AfrEA) ; on les fusionne si des pages suivantes en renvoient encore.
	 */
	public AfreaFeedSnapshot fetchAll(Instant updatedSince) {
		requireConfigured();
		List<AfreaFeedPageDto> pages = new ArrayList<>();
		String after = null;
		Instant generatedAt = null;
		int pageCount = 0;
		do {
			AfreaFeedPageDto page = fetchPage(after, updatedSince);
			pages.add(page);
			pageCount++;
			if (page.generatedAt() != null) {
				generatedAt = page.generatedAt();
			}
			if (!page.more() || page.nextAfter() == null || page.nextAfter().isBlank()) {
				break;
			}
			if (page.nextAfter().equals(after)) {
				throw new AfreaFeedException("Pagination bloquée : next_after inchangé.");
			}
			after = page.nextAfter();
		} while (pageCount < MAX_PAGES);

		if (pageCount >= MAX_PAGES) {
			throw new AfreaFeedException("Trop de pages AfrEA (>" + MAX_PAGES + ").");
		}

		log.info(
				"AfrEA feed fetched pages={} people≈{} institutions≈{} generatedAt={}",
				pageCount,
				pages.stream().mapToInt(p -> p.peopleOrEmpty().size()).sum(),
				pages.isEmpty() ? 0 : pages.getFirst().institutionsOrEmpty().size(),
				generatedAt);
		return AfreaFeedSnapshot.fromPages(generatedAt, pages);
	}

	public AfreaIdsResponseDto fetchActiveIds() {
		requireConfigured();
		return get("", Map.of("ids", "1"), AfreaIdsResponseDto.class);
	}

	private <T> T get(String path, Map<String, String> query, Class<T> type) {
		AppProperties.Afrea afrea = appProperties.getAfrea();
		int maxAttempts = Math.max(1, afrea.getMaxRetries() + 1);
		RuntimeException last = null;
		for (int attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				return restClient.get()
						.uri(uriBuilder -> {
							uriBuilder.path(path == null ? "" : path);
							query.forEach(uriBuilder::queryParam);
							return uriBuilder.build();
						})
						.accept(MediaType.APPLICATION_JSON)
						.retrieve()
						.body(type);
			} catch (RestClientResponseException ex) {
				last = new AfreaFeedException(ex.getStatusCode().value(),
						"AfrEA feed HTTP " + ex.getStatusCode().value());
				if (!retryable(ex.getStatusCode().value()) || attempt == maxAttempts) {
					throw last;
				}
				backoff(afrea.getRetryBackoffMs(), attempt);
			} catch (RuntimeException ex) {
				last = new AfreaFeedException("AfrEA feed call failed", ex);
				if (attempt == maxAttempts) {
					throw last;
				}
				backoff(afrea.getRetryBackoffMs(), attempt);
			}
		}
		throw last != null ? last : new AfreaFeedException("AfrEA feed call failed");
	}

	private void requireConfigured() {
		if (!appProperties.getAfrea().isConfigured()) {
			throw new AfreaFeedException(
					"AfrEA feed non configuré (AFREA_BASE_URL et AFREA_API_KEY requis).");
		}
	}

	private static boolean retryable(int status) {
		return status == 408 || status == 429 || status == 502 || status == 503 || status == 504;
	}

	private static void backoff(long baseMs, int attempt) {
		long sleep = Math.max(0, baseMs) * attempt;
		try {
			Thread.sleep(sleep);
		} catch (InterruptedException ie) {
			Thread.currentThread().interrupt();
			throw new AfreaFeedException("Interrupted during AfrEA retry backoff", ie);
		}
	}
}
