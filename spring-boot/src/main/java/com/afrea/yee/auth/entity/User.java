package com.afrea.yee.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "users")
public class User {

	@Id
	@UuidGenerator
	private UUID id;

	@Column(nullable = false, unique = true, length = 254)
	private String email;

	@Column(name = "password_hash", nullable = false)
	private String passwordHash;

	@Column(name = "display_name", nullable = false, length = 60)
	private String displayName;

	@Column(name = "mention_name", nullable = false, length = 80)
	private String mentionName = "";

	@Column(nullable = false, length = 500)
	private String bio = "";

	@Column(nullable = false, length = 120)
	private String profession = "";

	@Column(nullable = false, length = 120)
	private String organization = "";

	@Column(nullable = false, length = 120)
	private String location = "";

	@Column(name = "social_links_json", nullable = false, columnDefinition = "TEXT")
	private String socialLinksJson = "{}";

	@Column(name = "avatar_url")
	private String avatarUrl;

	@Column(name = "cover_url")
	private String coverUrl;

	@Column(name = "avatar_storage_path")
	private String avatarStoragePath;

	@Column(name = "cover_storage_path")
	private String coverStoragePath;

	@Column(name = "followers_count", nullable = false)
	private int followersCount;

	@Column(name = "following_count", nullable = false)
	private int followingCount;

	@Column(name = "posts_count", nullable = false)
	private int postsCount;

	@Column(name = "email_verified", nullable = false)
	private boolean emailVerified;

	@Column(name = "account_deactivated", nullable = false)
	private boolean accountDeactivated;

	@Column(name = "deactivated_at")
	private Instant deactivatedAt;

	@Column(name = "account_deleted", nullable = false)
	private boolean accountDeleted;

	@Column(name = "two_factor_enabled", nullable = false)
	private boolean twoFactorEnabled;

	@Column(name = "is_site_admin", nullable = false)
	private boolean siteAdmin;

	@Column(name = "who_can_message", nullable = false, length = 20)
	private String whoCanMessage = "friends";

	/** Préférence historique ; les mails métier (messages) ne sont plus envoyés. */
	@Column(name = "email_pref_messages", nullable = false)
	private boolean emailPrefMessages = false;

	@Column(name = "email_verification_token_hash", length = 64)
	private String emailVerificationTokenHash;

	@Column(name = "email_verification_expires_at")
	private Instant emailVerificationExpiresAt;

	@Column(name = "email_verification_sent_at")
	private Instant emailVerificationSentAt;

	@Column(name = "password_reset_token_hash", length = 64)
	private String passwordResetTokenHash;

	@Column(name = "password_reset_expires_at")
	private Instant passwordResetExpiresAt;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		createdAt = now;
		updatedAt = now;
		if (mentionName == null) {
			mentionName = "";
		}
		if (bio == null) {
			bio = "";
		}
		if (profession == null) {
			profession = "";
		}
		if (organization == null) {
			organization = "";
		}
		if (location == null) {
			location = "";
		}
		if (socialLinksJson == null) {
			socialLinksJson = "{}";
		}
		if (whoCanMessage == null || whoCanMessage.isBlank()) {
			whoCanMessage = "friends";
		}
	}

	@PreUpdate
	void onUpdate() {
		updatedAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public String getDisplayName() {
		return displayName;
	}

	public void setDisplayName(String displayName) {
		this.displayName = displayName;
	}

	public String getMentionName() {
		return mentionName;
	}

	public void setMentionName(String mentionName) {
		this.mentionName = mentionName;
	}

	public String getBio() {
		return bio;
	}

	public void setBio(String bio) {
		this.bio = bio;
	}

	public String getProfession() {
		return profession;
	}

	public void setProfession(String profession) {
		this.profession = profession;
	}

	public String getOrganization() {
		return organization;
	}

	public void setOrganization(String organization) {
		this.organization = organization;
	}

	public String getLocation() {
		return location;
	}

	public void setLocation(String location) {
		this.location = location;
	}

	public String getSocialLinksJson() {
		return socialLinksJson;
	}

	public void setSocialLinksJson(String socialLinksJson) {
		this.socialLinksJson = socialLinksJson;
	}

	public String getAvatarUrl() {
		return avatarUrl;
	}

	public void setAvatarUrl(String avatarUrl) {
		this.avatarUrl = avatarUrl;
	}

	public String getCoverUrl() {
		return coverUrl;
	}

	public void setCoverUrl(String coverUrl) {
		this.coverUrl = coverUrl;
	}

	public String getAvatarStoragePath() {
		return avatarStoragePath;
	}

	public void setAvatarStoragePath(String avatarStoragePath) {
		this.avatarStoragePath = avatarStoragePath;
	}

	public String getCoverStoragePath() {
		return coverStoragePath;
	}

	public void setCoverStoragePath(String coverStoragePath) {
		this.coverStoragePath = coverStoragePath;
	}

	public int getFollowersCount() {
		return followersCount;
	}

	public void setFollowersCount(int followersCount) {
		this.followersCount = followersCount;
	}

	public int getFollowingCount() {
		return followingCount;
	}

	public void setFollowingCount(int followingCount) {
		this.followingCount = followingCount;
	}

	public int getPostsCount() {
		return postsCount;
	}

	public void setPostsCount(int postsCount) {
		this.postsCount = postsCount;
	}

	public boolean isEmailVerified() {
		return emailVerified;
	}

	public void setEmailVerified(boolean emailVerified) {
		this.emailVerified = emailVerified;
	}

	public boolean isAccountDeactivated() {
		return accountDeactivated;
	}

	public void setAccountDeactivated(boolean accountDeactivated) {
		this.accountDeactivated = accountDeactivated;
	}

	public Instant getDeactivatedAt() {
		return deactivatedAt;
	}

	public void setDeactivatedAt(Instant deactivatedAt) {
		this.deactivatedAt = deactivatedAt;
	}

	public boolean isAccountDeleted() {
		return accountDeleted;
	}

	public void setAccountDeleted(boolean accountDeleted) {
		this.accountDeleted = accountDeleted;
	}

	public boolean isTwoFactorEnabled() {
		return twoFactorEnabled;
	}

	public void setTwoFactorEnabled(boolean twoFactorEnabled) {
		this.twoFactorEnabled = twoFactorEnabled;
	}

	public boolean isSiteAdmin() {
		return siteAdmin;
	}

	public void setSiteAdmin(boolean siteAdmin) {
		this.siteAdmin = siteAdmin;
	}

	public String getWhoCanMessage() {
		return whoCanMessage;
	}

	public void setWhoCanMessage(String whoCanMessage) {
		this.whoCanMessage = whoCanMessage;
	}

	public boolean isEmailPrefMessages() {
		return emailPrefMessages;
	}

	public void setEmailPrefMessages(boolean emailPrefMessages) {
		this.emailPrefMessages = emailPrefMessages;
	}

	public String getEmailVerificationTokenHash() {
		return emailVerificationTokenHash;
	}

	public void setEmailVerificationTokenHash(String emailVerificationTokenHash) {
		this.emailVerificationTokenHash = emailVerificationTokenHash;
	}

	public Instant getEmailVerificationExpiresAt() {
		return emailVerificationExpiresAt;
	}

	public void setEmailVerificationExpiresAt(Instant emailVerificationExpiresAt) {
		this.emailVerificationExpiresAt = emailVerificationExpiresAt;
	}

	public Instant getEmailVerificationSentAt() {
		return emailVerificationSentAt;
	}

	public void setEmailVerificationSentAt(Instant emailVerificationSentAt) {
		this.emailVerificationSentAt = emailVerificationSentAt;
	}

	public String getPasswordResetTokenHash() {
		return passwordResetTokenHash;
	}

	public void setPasswordResetTokenHash(String passwordResetTokenHash) {
		this.passwordResetTokenHash = passwordResetTokenHash;
	}

	public Instant getPasswordResetExpiresAt() {
		return passwordResetExpiresAt;
	}

	public void setPasswordResetExpiresAt(Instant passwordResetExpiresAt) {
		this.passwordResetExpiresAt = passwordResetExpiresAt;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
