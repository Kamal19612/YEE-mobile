package com.afrea.yee.common.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

	private String allowedOrigins = "";
	private String frontendUrl = "";
	private final Jwt jwt = new Jwt();
	private final Cookie cookie = new Cookie();
	private final Storage storage = new Storage();
	private final LinkPreview linkPreview = new LinkPreview();
	private final Mail mail = new Mail();
	private final Dev dev = new Dev();
	private final Vapid vapid = new Vapid();
	private final Afrea afrea = new Afrea();

	public List<String> getAllowedOrigins() {
		if (allowedOrigins == null || allowedOrigins.isBlank()) {
			return List.of();
		}
		return Arrays.stream(allowedOrigins.split(","))
				.map(String::trim)
				.filter(s -> !s.isEmpty())
				.toList();
	}

	public void setAllowedOrigins(String allowedOrigins) {
		this.allowedOrigins = allowedOrigins != null ? allowedOrigins : "";
	}

	public String getFrontendUrl() {
		return frontendUrl;
	}

	public void setFrontendUrl(String frontendUrl) {
		this.frontendUrl = frontendUrl != null ? frontendUrl : "";
	}

	public Jwt getJwt() {
		return jwt;
	}

	public Cookie getCookie() {
		return cookie;
	}

	public Storage getStorage() {
		return storage;
	}

	public LinkPreview getLinkPreview() {
		return linkPreview;
	}

	public Mail getMail() {
		return mail;
	}

	public Dev getDev() {
		return dev;
	}

	public Vapid getVapid() {
		return vapid;
	}

	public Afrea getAfrea() {
		return afrea;
	}

	/**
	 * Origine obligatoire et présente dans la liste blanche.
	 * Une requête sans Origin (client non navigateur, ou en-tête retiré)
	 * ne renouvelle pas la session : le cookie httpOnly ne suffit pas.
	 */
	public boolean isOriginAllowed(String origin) {
		if (origin == null || origin.isBlank()) {
			return false;
		}
		return getAllowedOrigins().contains(origin);
	}

	public static class Jwt {
		private String secret = "";
		private String issuer = "yee-api";
		private long accessTtlSeconds = 900;

		public String getSecret() {
			return secret;
		}

		public void setSecret(String secret) {
			this.secret = secret;
		}

		public String getIssuer() {
			return issuer;
		}

		public void setIssuer(String issuer) {
			this.issuer = issuer;
		}

		public long getAccessTtlSeconds() {
			return accessTtlSeconds;
		}

		public void setAccessTtlSeconds(long accessTtlSeconds) {
			this.accessTtlSeconds = accessTtlSeconds;
		}
	}

	public static class Cookie {
		/** None | Lax | Strict. Lax : le cookie de session n'est pas envoyé depuis un autre site. */
		private String sameSite = "Lax";
		private boolean secure = true;

		public String getSameSite() {
			return sameSite;
		}

		public void setSameSite(String sameSite) {
			this.sameSite = sameSite;
		}

		public boolean isSecure() {
			return secure;
		}

		public void setSecure(boolean secure) {
			this.secure = secure;
		}
	}

	public static class Storage {
		/** local (défaut) | supabase */
		private String provider = "local";
		private String localRoot = "./data/storage";
		private String localPublicBaseUrl = "/media";
		private String supabaseUrl = "";
		private String supabaseServiceRoleKey = "";

		public String getProvider() {
			return provider;
		}

		public void setProvider(String provider) {
			this.provider = provider;
		}

		public String getLocalRoot() {
			return localRoot;
		}

		public void setLocalRoot(String localRoot) {
			this.localRoot = localRoot;
		}

		public String getLocalPublicBaseUrl() {
			return localPublicBaseUrl;
		}

		public void setLocalPublicBaseUrl(String localPublicBaseUrl) {
			this.localPublicBaseUrl = localPublicBaseUrl;
		}

		public String getSupabaseUrl() {
			return supabaseUrl;
		}

		public void setSupabaseUrl(String supabaseUrl) {
			this.supabaseUrl = supabaseUrl;
		}

		public String getSupabaseServiceRoleKey() {
			return supabaseServiceRoleKey;
		}

		public void setSupabaseServiceRoleKey(String supabaseServiceRoleKey) {
			this.supabaseServiceRoleKey = supabaseServiceRoleKey;
		}
	}

	public static class LinkPreview {
		/** Hôtes interdits (domaine de l'API / site), séparés par virgules. */
		private String blockedHosts = "";

		public String getBlockedHosts() {
			return blockedHosts;
		}

		public void setBlockedHosts(String blockedHosts) {
			this.blockedHosts = blockedHosts != null ? blockedHosts : "";
		}
	}

	/** Expéditeur des mails transactionnels (verify, reset, avis message). */
	public static class Mail {
		/** Ex. {@code AfrEA-YEE <noreply@example.org>}. Vide → spring.mail.username. */
		private String from = "";

		public String getFrom() {
			return from;
		}

		public void setFrom(String from) {
			this.from = from != null ? from : "";
		}
	}

	/**
	 * Aides au développement local uniquement.
	 * Ne jamais activer exposeEmailLinks en production.
	 */
	public static class Dev {
		/** Si true, register/forgot renvoient le lien dans la réponse JSON. */
		private boolean exposeEmailLinks = false;

		public boolean isExposeEmailLinks() {
			return exposeEmailLinks;
		}

		public void setExposeEmailLinks(boolean exposeEmailLinks) {
			this.exposeEmailLinks = exposeEmailLinks;
		}
	}

	/**
	 * Miroir AfrEA (feed read-only). Clé et URL via variables d'environnement.
	 * Ne jamais committer {@code api-key}.
	 */
	public static class Afrea {
		/** Ex. {@code https://afrea.org/aed-feed} (sans slash final). */
		private String baseUrl = "";
		private String apiKey = "";
		/** En-tête portant la clé (défaut X-AFREA-KEY ; Bearer aussi supporté côté AfrEA). */
		private String apiKeyHeader = "X-AFREA-KEY";
		private int connectTimeoutMs = 10_000;
		private int readTimeoutMs = 60_000;
		private int maxRetries = 3;
		private long retryBackoffMs = 500;
		private String profileEditUrl = "";
		private final Sync sync = new Sync();
		private final SignedLink signedLink = new SignedLink();

		public String getBaseUrl() {
			return baseUrl;
		}

		public void setBaseUrl(String baseUrl) {
			this.baseUrl = baseUrl != null ? baseUrl : "";
		}

		public String getApiKey() {
			return apiKey;
		}

		public void setApiKey(String apiKey) {
			this.apiKey = apiKey != null ? apiKey : "";
		}

		public String getApiKeyHeader() {
			return apiKeyHeader;
		}

		public void setApiKeyHeader(String apiKeyHeader) {
			this.apiKeyHeader = apiKeyHeader != null && !apiKeyHeader.isBlank() ? apiKeyHeader : "X-AFREA-KEY";
		}

		public int getConnectTimeoutMs() {
			return connectTimeoutMs;
		}

		public void setConnectTimeoutMs(int connectTimeoutMs) {
			this.connectTimeoutMs = connectTimeoutMs;
		}

		public int getReadTimeoutMs() {
			return readTimeoutMs;
		}

		public void setReadTimeoutMs(int readTimeoutMs) {
			this.readTimeoutMs = readTimeoutMs;
		}

		public int getMaxRetries() {
			return maxRetries;
		}

		public void setMaxRetries(int maxRetries) {
			this.maxRetries = maxRetries;
		}

		public long getRetryBackoffMs() {
			return retryBackoffMs;
		}

		public void setRetryBackoffMs(long retryBackoffMs) {
			this.retryBackoffMs = retryBackoffMs;
		}

		public String getProfileEditUrl() {
			return profileEditUrl;
		}

		public void setProfileEditUrl(String profileEditUrl) {
			this.profileEditUrl = profileEditUrl != null ? profileEditUrl : "";
		}

		public Sync getSync() {
			return sync;
		}

		public SignedLink getSignedLink() {
			return signedLink;
		}

		public boolean isConfigured() {
			return baseUrl != null && !baseUrl.isBlank() && apiKey != null && !apiKey.isBlank();
		}

		public static class Sync {
			/** Cron Spring (défaut 02:00 UTC). Activé au commit job. */
			private String cron = "0 0 2 * * *";

			public String getCron() {
				return cron;
			}

			public void setCron(String cron) {
				this.cron = cron != null && !cron.isBlank() ? cron : "0 0 2 * * *";
			}
		}

		/** Emplacement futur Step 3 AfrEA→AED — désactivé en v1. */
		public static class SignedLink {
			private boolean enabled = false;

			public boolean isEnabled() {
				return enabled;
			}

			public void setEnabled(boolean enabled) {
				this.enabled = enabled;
			}
		}
	}

	/** Clés VAPID pour Web Push (iOS PWA + Android). Générer via {@code npx web-push generate-vapid-keys}. */
	public static class Vapid {
		private String publicKey = "";
		private String privateKey = "";
		/** Contact mailto: ou https: exigé par la spec VAPID. */
		private String subject = "mailto:noreply@yee.local";

		public String getPublicKey() {
			return publicKey;
		}

		public void setPublicKey(String publicKey) {
			this.publicKey = publicKey != null ? publicKey : "";
		}

		public String getPrivateKey() {
			return privateKey;
		}

		public void setPrivateKey(String privateKey) {
			this.privateKey = privateKey != null ? privateKey : "";
		}

		public String getSubject() {
			return subject;
		}

		public void setSubject(String subject) {
			this.subject = subject != null ? subject : "";
		}
	}
}
