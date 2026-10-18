package com.afrea.yee.events.entity;

import com.afrea.yee.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "events")
public class Event {

	@Id
	@UuidGenerator
	private UUID id;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(nullable = false, unique = true, length = 220)
	private String slug;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id", nullable = false)
	private EventCategory category;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String description = "";

	@Column(name = "starts_at", nullable = false)
	private Instant startsAt;

	@Column(name = "ends_at", nullable = false)
	private Instant endsAt;

	@Column(name = "location_type", nullable = false, length = 20)
	private String locationType = "online";

	@Column(name = "join_url", columnDefinition = "TEXT")
	private String joinUrl;

	@Column(name = "venue_address", columnDefinition = "TEXT")
	private String venueAddress;

	@Column(name = "cover_type", length = 10)
	private String coverType;

	@Column(name = "cover_storage_bucket", length = 64)
	private String coverStorageBucket;

	@Column(name = "cover_storage_path", columnDefinition = "TEXT")
	private String coverStoragePath;

	@Column(name = "cover_mime_type", length = 100)
	private String coverMimeType;

	@Column(name = "video_url", columnDefinition = "TEXT")
	private String videoUrl;

	@Column(name = "video_provider", length = 20)
	private String videoProvider;

	@Column(name = "video_external_id", length = 80)
	private String videoExternalId;

	@Column(nullable = false, length = 20)
	private String status = "published";

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "created_by", nullable = false)
	private User createdBy;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		createdAt = now;
		updatedAt = now;
		if (endsAt == null) {
			endsAt = startsAt;
		}
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getSlug() {
		return slug;
	}

	public void setSlug(String slug) {
		this.slug = slug;
	}

	public EventCategory getCategory() {
		return category;
	}

	public void setCategory(EventCategory category) {
		this.category = category;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public Instant getStartsAt() {
		return startsAt;
	}

	public void setStartsAt(Instant startsAt) {
		this.startsAt = startsAt;
	}

	public Instant getEndsAt() {
		return endsAt;
	}

	public void setEndsAt(Instant endsAt) {
		this.endsAt = endsAt;
	}

	public String getLocationType() {
		return locationType;
	}

	public void setLocationType(String locationType) {
		this.locationType = locationType;
	}

	public String getJoinUrl() {
		return joinUrl;
	}

	public void setJoinUrl(String joinUrl) {
		this.joinUrl = joinUrl;
	}

	public String getVenueAddress() {
		return venueAddress;
	}

	public void setVenueAddress(String venueAddress) {
		this.venueAddress = venueAddress;
	}

	public String getCoverType() {
		return coverType;
	}

	public void setCoverType(String coverType) {
		this.coverType = coverType;
	}

	public String getCoverStorageBucket() {
		return coverStorageBucket;
	}

	public void setCoverStorageBucket(String coverStorageBucket) {
		this.coverStorageBucket = coverStorageBucket;
	}

	public String getCoverStoragePath() {
		return coverStoragePath;
	}

	public void setCoverStoragePath(String coverStoragePath) {
		this.coverStoragePath = coverStoragePath;
	}

	public String getCoverMimeType() {
		return coverMimeType;
	}

	public void setCoverMimeType(String coverMimeType) {
		this.coverMimeType = coverMimeType;
	}

	public String getVideoUrl() {
		return videoUrl;
	}

	public void setVideoUrl(String videoUrl) {
		this.videoUrl = videoUrl;
	}

	public String getVideoProvider() {
		return videoProvider;
	}

	public void setVideoProvider(String videoProvider) {
		this.videoProvider = videoProvider;
	}

	public String getVideoExternalId() {
		return videoExternalId;
	}

	public void setVideoExternalId(String videoExternalId) {
		this.videoExternalId = videoExternalId;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public User getCreatedBy() {
		return createdBy;
	}

	public void setCreatedBy(User createdBy) {
		this.createdBy = createdBy;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
