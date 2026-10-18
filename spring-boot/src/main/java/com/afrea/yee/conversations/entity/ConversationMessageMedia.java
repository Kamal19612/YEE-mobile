package com.afrea.yee.conversations.entity;

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
@Table(name = "conversation_message_media")
public class ConversationMessageMedia {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "message_id", nullable = false)
	private ConversationMessage message;

	@Column(name = "media_type", nullable = false, length = 10)
	private String mediaType;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String url;

	@Column(name = "storage_path")
	private String storagePath;

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

	public Long getId() {
		return id;
	}

	public ConversationMessage getMessage() {
		return message;
	}

	public void setMessage(ConversationMessage message) {
		this.message = message;
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

	public int getSortOrder() {
		return sortOrder;
	}

	public void setSortOrder(int sortOrder) {
		this.sortOrder = sortOrder;
	}
}
