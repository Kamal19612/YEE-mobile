package com.afrea.yee.feed.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "link_previews")
public class LinkPreview {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "url_hash", nullable = false, unique = true, length = 64)
	private String urlHash;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String url;

	@Column(name = "preview_type", nullable = false, length = 20)
	private String previewType = "website";

	@Column(columnDefinition = "TEXT")
	private String title;

	@Column(columnDefinition = "TEXT")
	private String description;

	@Column(name = "image_url", columnDefinition = "TEXT")
	private String imageUrl;

	@Column(name = "site_name", columnDefinition = "TEXT")
	private String siteName;

	@Column(name = "video_id")
	private String videoId;

	@Column(name = "embed_url", columnDefinition = "TEXT")
	private String embedUrl;

	@Column(name = "fetch_failed", nullable = false)
	private boolean fetchFailed;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public Long getId() {
		return id;
	}

	public String getUrlHash() {
		return urlHash;
	}

	public void setUrlHash(String urlHash) {
		this.urlHash = urlHash;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public String getPreviewType() {
		return previewType;
	}

	public void setPreviewType(String previewType) {
		this.previewType = previewType;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getImageUrl() {
		return imageUrl;
	}

	public void setImageUrl(String imageUrl) {
		this.imageUrl = imageUrl;
	}

	public String getSiteName() {
		return siteName;
	}

	public void setSiteName(String siteName) {
		this.siteName = siteName;
	}

	public String getVideoId() {
		return videoId;
	}

	public void setVideoId(String videoId) {
		this.videoId = videoId;
	}

	public String getEmbedUrl() {
		return embedUrl;
	}

	public void setEmbedUrl(String embedUrl) {
		this.embedUrl = embedUrl;
	}

	public boolean isFetchFailed() {
		return fetchFailed;
	}

	public void setFetchFailed(boolean fetchFailed) {
		this.fetchFailed = fetchFailed;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getExpiresAt() {
		return expiresAt;
	}

	public void setExpiresAt(Instant expiresAt) {
		this.expiresAt = expiresAt;
	}
}
