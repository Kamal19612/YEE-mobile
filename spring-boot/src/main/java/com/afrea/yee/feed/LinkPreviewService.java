package com.afrea.yee.feed;

import com.afrea.yee.auth.TokenHasher;
import com.afrea.yee.common.config.AppProperties;
import com.afrea.yee.feed.dto.LinkPreviewResponse;
import com.afrea.yee.feed.entity.LinkPreview;
import com.afrea.yee.feed.repository.LinkPreviewRepository;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Fetch d'URL utilisateur — surface SSRF. Chaque protection audit §4.4 est
 * implémentée ci-dessous (schéma, DNS/IP, self-host, redirects manuels,
 * timeout/taille, YouTube oEmbed sans html, cache 7j).
 */
@Service
public class LinkPreviewService {

	private static final Logger log = LoggerFactory.getLogger(LinkPreviewService.class);
	private static final int MAX_REDIRECTS = 5;
	private static final int MAX_BYTES = 300 * 1024;
	private static final Duration TIMEOUT = Duration.ofSeconds(5);
	private static final int CACHE_DAYS = 7;

	private static final Pattern YT_PATTERNS = Pattern.compile(
			"(?:youtube\\.com/watch\\?.*?v=|youtu\\.be/|youtube\\.com/embed/|youtube\\.com/shorts/)([A-Za-z0-9_-]{6,})",
			Pattern.CASE_INSENSITIVE);

	private final LinkPreviewRepository linkPreviewRepository;
	private final AppProperties appProperties;
	private final ObjectMapper objectMapper;
	private final HttpClient httpClient;

	public LinkPreviewService(
			LinkPreviewRepository linkPreviewRepository,
			AppProperties appProperties,
			ObjectMapper objectMapper) {
		this.linkPreviewRepository = linkPreviewRepository;
		this.appProperties = appProperties;
		this.objectMapper = objectMapper;
		this.httpClient = HttpClient.newBuilder()
				.followRedirects(HttpClient.Redirect.NEVER)
				.connectTimeout(TIMEOUT)
				.build();
	}

	@Transactional
	public Optional<LinkPreview> resolveCached(String rawUrl) {
		if (rawUrl == null || rawUrl.isBlank()) {
			return Optional.empty();
		}
		String normalized = rawUrl.trim();
		String hash = TokenHasher.sha256(normalized.toLowerCase(Locale.ROOT));
		Optional<LinkPreview> existing = linkPreviewRepository.findByUrlHash(hash);
		if (existing.isPresent() && existing.get().getExpiresAt().isAfter(Instant.now())) {
			LinkPreview cached = existing.get();
			return cached.isFetchFailed() ? Optional.empty() : Optional.of(cached);
		}

		LinkPreview preview = existing.orElseGet(LinkPreview::new);
		preview.setUrlHash(hash);
		preview.setUrl(normalized);
		preview.setExpiresAt(Instant.now().plus(CACHE_DAYS, ChronoUnit.DAYS));

		try {
			SafeUrl safe = validateUrl(normalized);
			if (isYouTube(safe.uri().getHost())) {
				fillYouTube(preview, safe.uri());
			} else {
				fillWebsite(preview, safe);
			}
			preview.setFetchFailed(false);
		} catch (Exception ex) {
			log.debug("Link preview failed for {}: {}", normalized, ex.toString());
			preview.setFetchFailed(true);
			preview.setPreviewType("website");
			preview.setTitle(null);
			preview.setDescription(null);
			preview.setImageUrl(null);
			preview.setSiteName(null);
			preview.setVideoId(null);
			preview.setEmbedUrl(null);
		}

		linkPreviewRepository.save(preview);
		return preview.isFetchFailed() ? Optional.empty() : Optional.of(preview);
	}

	public LinkPreviewResponse toResponse(LinkPreview preview) {
		if (preview == null || preview.isFetchFailed()) {
			return null;
		}
		return new LinkPreviewResponse(
				preview.getUrl(),
				preview.getPreviewType(),
				preview.getTitle(),
				preview.getDescription(),
				preview.getImageUrl(),
				preview.getSiteName(),
				preview.getVideoId(),
				preview.getEmbedUrl());
	}

	/** (a)(b)(c) Validation schéma + DNS/IP + self-host. */
	SafeUrl validateUrl(String raw) throws Exception {
		URI uri = URI.create(raw.trim());
		String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
		if (!scheme.equals("http") && !scheme.equals("https")) {
			throw new IllegalArgumentException("scheme");
		}
		if (uri.getHost() == null || uri.getHost().isBlank()) {
			throw new IllegalArgumentException("host");
		}
		String host = uri.getHost().toLowerCase(Locale.ROOT);
		if (blockedHosts().contains(host)) {
			throw new IllegalArgumentException("self-host");
		}

		InetAddress[] addresses = InetAddress.getAllByName(host);
		if (addresses.length == 0) {
			throw new IllegalArgumentException("dns");
		}
		for (InetAddress address : addresses) {
			if (isBlockedIp(address)) {
				throw new IllegalArgumentException("private-ip");
			}
		}
		return new SafeUrl(uri, Arrays.asList(addresses));
	}

	private void fillYouTube(LinkPreview preview, URI uri) throws Exception {
		Matcher m = YT_PATTERNS.matcher(uri.toString());
		if (!m.find()) {
			throw new IllegalArgumentException("youtube-id");
		}
		String videoId = m.group(1);
		// oEmbed officiel — on ne fait PAS confiance au champ html
		URI oembed = URI.create(
				"https://www.youtube.com/oembed?format=json&url="
						+ java.net.URLEncoder.encode(uri.toString(), StandardCharsets.UTF_8));
		SafeUrl safeOembed = validateUrl(oembed.toString());
		String body = fetchBody(safeOembed);
		JsonNode json = objectMapper.readTree(body);
		preview.setPreviewType("video");
		preview.setTitle(textOrNull(json, "title"));
		preview.setSiteName("YouTube");
		preview.setDescription(null);
		preview.setImageUrl(textOrNull(json, "thumbnail_url"));
		preview.setVideoId(videoId);
		preview.setEmbedUrl("https://www.youtube-nocookie.com/embed/" + videoId);
		// json.get("html") volontairement ignoré
	}

	private void fillWebsite(LinkPreview preview, SafeUrl start) throws Exception {
		String html = fetchWithManualRedirects(start);
		Document doc = Jsoup.parse(html, start.uri().toString());
		preview.setPreviewType("website");
		preview.setTitle(firstNonBlank(
				meta(doc, "og:title"),
				doc.title()));
		preview.setDescription(firstNonBlank(
				meta(doc, "og:description"),
				meta(doc, "description")));
		preview.setImageUrl(meta(doc, "og:image"));
		preview.setSiteName(firstNonBlank(
				meta(doc, "og:site_name"),
				start.uri().getHost()));
		preview.setVideoId(null);
		preview.setEmbedUrl(null);
	}

	/** (d)(e) Redirects manuels + timeout/taille. */
	private String fetchWithManualRedirects(SafeUrl start) throws Exception {
		SafeUrl current = start;
		for (int i = 0; i <= MAX_REDIRECTS; i++) {
			HttpResponse<InputStream> response = send(current);
			int code = response.statusCode();
			if (code >= 300 && code < 400) {
				String location = response.headers().firstValue("Location").orElse(null);
				if (location == null || location.isBlank()) {
					throw new IllegalArgumentException("redirect");
				}
				URI next = current.uri().resolve(location);
				current = validateUrl(next.toString());
				continue;
			}
			if (code < 200 || code >= 300) {
				throw new IllegalArgumentException("http-" + code);
			}
			return readLimited(response.body());
		}
		throw new IllegalArgumentException("too-many-redirects");
	}

	private String fetchBody(SafeUrl safeUrl) throws Exception {
		HttpResponse<InputStream> response = send(safeUrl);
		if (response.statusCode() < 200 || response.statusCode() >= 300) {
			throw new IllegalArgumentException("http-" + response.statusCode());
		}
		return readLimited(response.body());
	}

	private HttpResponse<InputStream> send(SafeUrl safeUrl) throws Exception {
		HttpRequest request = HttpRequest.newBuilder(safeUrl.uri())
				.timeout(TIMEOUT)
				.header("User-Agent", "YEE-LinkPreview/1.0")
				.GET()
				.build();
		return httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
	}

	private static String readLimited(InputStream in) throws Exception {
		try (in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
			byte[] buf = new byte[8192];
			int total = 0;
			int n;
			while ((n = in.read(buf)) >= 0) {
				total += n;
				if (total > MAX_BYTES) {
					throw new IllegalArgumentException("too-large");
				}
				out.write(buf, 0, n);
			}
			return out.toString(StandardCharsets.UTF_8);
		}
	}

	static boolean isBlockedIp(InetAddress address) {
		if (address.isAnyLocalAddress()
				|| address.isLoopbackAddress()
				|| address.isLinkLocalAddress()
				|| address.isSiteLocalAddress()
				|| address.isMulticastAddress()) {
			return true;
		}
		byte[] b = address.getAddress();
		if (b.length == 4) {
			int a0 = b[0] & 0xFF;
			int a1 = b[1] & 0xFF;
			// 169.254.0.0/16 link-local already covered; cloud metadata:
			if (a0 == 169 && a1 == 254) {
				return true;
			}
			// 10/8, 172.16/12, 192.168/16 covered by isSiteLocalAddress
			// CGNAT 100.64/10
			if (a0 == 100 && a1 >= 64 && a1 <= 127) {
				return true;
			}
			// 127/8 covered by loopback; 0.0.0.0 covered by any-local
		}
		if (b.length == 16) {
			// fc00::/7 unique local
			if ((b[0] & 0xFE) == 0xFC) {
				return true;
			}
		}
		String hostAddress = address.getHostAddress();
		return "169.254.169.254".equals(hostAddress);
	}

	private Set<String> blockedHosts() {
		Set<String> hosts = new HashSet<>();
		String configured = appProperties.getLinkPreview().getBlockedHosts();
		if (configured != null && !configured.isBlank()) {
			Arrays.stream(configured.split(","))
					.map(String::trim)
					.map(s -> s.toLowerCase(Locale.ROOT))
					.filter(s -> !s.isEmpty())
					.forEach(hosts::add);
		}
		String frontend = appProperties.getFrontendUrl();
		if (frontend != null && !frontend.isBlank()) {
			try {
				URI fu = URI.create(frontend);
				if (fu.getHost() != null) {
					hosts.add(fu.getHost().toLowerCase(Locale.ROOT));
				}
			} catch (Exception ignored) {
				// ignore malformed frontend URL
			}
		}
		return hosts;
	}

	private static boolean isYouTube(String host) {
		if (host == null) {
			return false;
		}
		String h = host.toLowerCase(Locale.ROOT);
		return h.equals("youtube.com")
				|| h.equals("www.youtube.com")
				|| h.equals("m.youtube.com")
				|| h.equals("youtu.be")
				|| h.endsWith(".youtube.com");
	}

	private static String meta(Document doc, String property) {
		var byProp = doc.selectFirst("meta[property=" + property + "]");
		if (byProp != null) {
			return byProp.attr("content");
		}
		var byName = doc.selectFirst("meta[name=" + property + "]");
		return byName != null ? byName.attr("content") : null;
	}

	private static String firstNonBlank(String... values) {
		for (String v : values) {
			if (v != null && !v.isBlank()) {
				return v.trim();
			}
		}
		return null;
	}

	private static String textOrNull(JsonNode node, String field) {
		JsonNode v = node.get(field);
		if (v == null || v.isNull()) {
			return null;
		}
		String s = v.asString();
		return s == null || s.isBlank() ? null : s;
	}

	record SafeUrl(URI uri, java.util.List<InetAddress> addresses) {
	}
}
