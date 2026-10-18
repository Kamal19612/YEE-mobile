package com.afrea.yee.feed.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "post_media")
public class PostMedia {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "post_id", nullable = false)
	private Post post;

	@Column(name = "media_type", nullable = false, length = 10)
	private String mediaType;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String url;

	@Column(name = "storage_path")
	private String storagePath;

	/** post-media (public) ou group-post-media (private / secret). */
	@Column(name = "storage_bucket", nullable = false, length = 40)
	private String storageBucket = "post-media";

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

	@Column(name = "original_filename", length = 255)
	private String originalFilename;

	@Column(name = "byte_size")
	private Long byteSize;

	public Long getId() {
		return id;
	}

	public Post getPost() {
		return post;
	}

	public void setPost(Post post) {
		this.post = post;
	}

	public String getMediaType() {
		return mediaType;
	}

	public void setMediaType(String mediaType) {
		this.mediaType = mediaType;
	}

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public String getStoragePath() {
		return storagePath;
	}

	public void setStoragePath(String storagePath) {
		this.storagePath = storagePath;
	}

	public String getStorageBucket() {
		return storageBucket;
	}

	public void setStorageBucket(String storageBucket) {
		this.storageBucket = storageBucket;
	}

	public int getSortOrder() {
		return sortOrder;
	}

	public void setSortOrder(int sortOrder) {
		this.sortOrder = sortOrder;
	}

	public String getOriginalFilename() {
		return originalFilename;
	}

	public void setOriginalFilename(String originalFilename) {
		this.originalFilename = originalFilename;
	}

	public Long getByteSize() {
		return byteSize;
	}

	public void setByteSize(Long byteSize) {
		this.byteSize = byteSize;
	}
}
