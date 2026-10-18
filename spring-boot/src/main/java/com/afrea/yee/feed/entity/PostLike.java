package com.afrea.yee.feed.entity;

import com.afrea.yee.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "post_likes")
@IdClass(PostLike.PostLikeId.class)
public class PostLike {

	@Id
	@Column(name = "post_id")
	private Long postId;

	@Id
	@Column(name = "user_id")
	private UUID userId;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "post_id", insertable = false, updatable = false)
	private Post post;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", insertable = false, updatable = false)
	private User user;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@PrePersist
	void onCreate() {
		if (createdAt == null) {
			createdAt = Instant.now();
		}
	}

	public Long getPostId() {
		return postId;
	}

	public void setPostId(Long postId) {
		this.postId = postId;
	}

	public UUID getUserId() {
		return userId;
	}

	public void setUserId(UUID userId) {
		this.userId = userId;
	}

	public Post getPost() {
		return post;
	}

	public User getUser() {
		return user;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public static class PostLikeId implements Serializable {
		private Long postId;
		private UUID userId;

		public PostLikeId() {
		}

		public PostLikeId(Long postId, UUID userId) {
			this.postId = postId;
			this.userId = userId;
		}

		@Override
		public boolean equals(Object o) {
			if (this == o) {
				return true;
			}
			if (!(o instanceof PostLikeId that)) {
				return false;
			}
			return Objects.equals(postId, that.postId) && Objects.equals(userId, that.userId);
		}

		@Override
		public int hashCode() {
			return Objects.hash(postId, userId);
		}
	}
}
