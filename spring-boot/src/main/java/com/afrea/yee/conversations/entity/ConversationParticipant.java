package com.afrea.yee.conversations.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversation_participants")
public class ConversationParticipant {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "conversation_id", nullable = false)
	private Conversation conversation;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "last_read_at")
	private Instant lastReadAt;

	@Column(name = "joined_at", nullable = false)
	private Instant joinedAt;

	/** Si non null, la conversation est masquée pour cet utilisateur (supprimer pour moi). */
	@Column(name = "hidden_at")
	private Instant hiddenAt;

	@PrePersist
	void onCreate() {
		if (joinedAt == null) {
			joinedAt = Instant.now();
		}
	}

	public Long getId() {
		return id;
	}

	public Conversation getConversation() {
		return conversation;
	}

	public void setConversation(Conversation conversation) {
		this.conversation = conversation;
	}

	public UUID getUserId() {
		return userId;
	}

	public void setUserId(UUID userId) {
		this.userId = userId;
	}

	public Instant getLastReadAt() {
		return lastReadAt;
	}

	public void setLastReadAt(Instant lastReadAt) {
		this.lastReadAt = lastReadAt;
	}

	public Instant getJoinedAt() {
		return joinedAt;
	}

	public void setJoinedAt(Instant joinedAt) {
		this.joinedAt = joinedAt;
	}

	public Instant getHiddenAt() {
		return hiddenAt;
	}

	public void setHiddenAt(Instant hiddenAt) {
		this.hiddenAt = hiddenAt;
	}
}
