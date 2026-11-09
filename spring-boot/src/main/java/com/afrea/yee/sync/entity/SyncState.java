package com.afrea.yee.sync.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Singleton (id = 1) : dernier sync réussi + verrou anti-concurrence. */
@Entity
@Table(name = "sync_state")
public class SyncState {

	public static final short SINGLETON_ID = 1;

	@Id
	private Short id = SINGLETON_ID;

	@Column(name = "last_sync_at")
	private Instant lastSyncAt;

	@Column(name = "lock_owner", length = 64)
	private String lockOwner;

	@Column(name = "lock_acquired_at")
	private Instant lockAcquiredAt;

	public Short getId() {
		return id;
	}

	public void setId(Short id) {
		this.id = id;
	}

	public Instant getLastSyncAt() {
		return lastSyncAt;
	}

	public void setLastSyncAt(Instant lastSyncAt) {
		this.lastSyncAt = lastSyncAt;
	}

	public String getLockOwner() {
		return lockOwner;
	}

	public void setLockOwner(String lockOwner) {
		this.lockOwner = lockOwner;
	}

	public Instant getLockAcquiredAt() {
		return lockAcquiredAt;
	}

	public void setLockAcquiredAt(Instant lockAcquiredAt) {
		this.lockAcquiredAt = lockAcquiredAt;
	}
}
