package com.afrea.yee.resources.entity;

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
@Table(name = "library_resources")
public class LibraryResource {

	@Id
	@UuidGenerator
	private UUID id;

	@Column(nullable = false, length = 200)
	private String title;

	@Column(nullable = false, unique = true, length = 220)
	private String slug;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id", nullable = false)
	private LibraryCategory category;

	@Column(nullable = false, length = 10)
	private String language;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String description = "";

	@Column(name = "storage_bucket", nullable = false, length = 64)
	private String storageBucket;

	@Column(name = "storage_path", nullable = false, columnDefinition = "TEXT")
	private String storagePath;

	@Column(name = "original_filename", nullable = false, length = 255)
	private String originalFilename;

	@Column(name = "mime_type", nullable = false, length = 100)
	private String mimeType = "application/pdf";

	@Column(name = "byte_size", nullable = false)
	private long byteSize;

	@Column(name = "cover_storage_path", columnDefinition = "TEXT")
	private String coverStoragePath;

	@Column(name = "cover_mime_type", length = 100)
	private String coverMimeType;

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

	public LibraryCategory getCategory() {
		return category;
	}

	public void setCategory(LibraryCategory category) {
		this.category = category;
	}

	public String getLanguage() {
		return language;
	}

	public void setLanguage(String language) {
		this.language = language;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getStorageBucket() {
		return storageBucket;
	}

	public void setStorageBucket(String storageBucket) {
		this.storageBucket = storageBucket;
	}

	public String getStoragePath() {
		return storagePath;
	}

	public void setStoragePath(String storagePath) {
		this.storagePath = storagePath;
	}

	public String getOriginalFilename() {
		return originalFilename;
	}

	public void setOriginalFilename(String originalFilename) {
		this.originalFilename = originalFilename;
	}

	public String getMimeType() {
		return mimeType;
	}

	public void setMimeType(String mimeType) {
		this.mimeType = mimeType;
	}

	public long getByteSize() {
		return byteSize;
	}

	public void setByteSize(long byteSize) {
		this.byteSize = byteSize;
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
