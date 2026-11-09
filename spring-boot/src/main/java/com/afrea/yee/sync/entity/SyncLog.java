package com.afrea.yee.sync.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "sync_log")
public class SyncLog {

	public static final String RUNNING = "RUNNING";
	public static final String SUCCESS = "SUCCESS";
	public static final String PARTIAL = "PARTIAL";
	public static final String FAILED = "FAILED";

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "started_at", nullable = false)
	private Instant startedAt;

	@Column(name = "ended_at")
	private Instant endedAt;

	@Column(nullable = false, length = 20)
	private String status = RUNNING;

	@Column(name = "created_count", nullable = false)
	private int createdCount;

	@Column(name = "updated_count", nullable = false)
	private int updatedCount;

	@Column(name = "skipped_count", nullable = false)
	private int skippedCount;

	@Column(name = "error_count", nullable = false)
	private int errorCount;

	@Column(name = "summary_json", nullable = false, columnDefinition = "TEXT")
	private String summaryJson = "{}";

	@Column(name = "error_details", nullable = false, columnDefinition = "TEXT")
	private String errorDetails = "";

	@PrePersist
	void onCreate() {
		if (startedAt == null) {
			startedAt = Instant.now();
		}
		if (summaryJson == null) {
			summaryJson = "{}";
		}
		if (errorDetails == null) {
			errorDetails = "";
		}
	}

	public Long getId() {
		return id;
	}

	public Instant getStartedAt() {
		return startedAt;
	}

	public void setStartedAt(Instant startedAt) {
		this.startedAt = startedAt;
	}

	public Instant getEndedAt() {
		return endedAt;
	}

	public void setEndedAt(Instant endedAt) {
		this.endedAt = endedAt;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public int getCreatedCount() {
		return createdCount;
	}

	public void setCreatedCount(int createdCount) {
		this.createdCount = createdCount;
	}

	public int getUpdatedCount() {
		return updatedCount;
	}

	public void setUpdatedCount(int updatedCount) {
		this.updatedCount = updatedCount;
	}

	public int getSkippedCount() {
		return skippedCount;
	}

	public void setSkippedCount(int skippedCount) {
		this.skippedCount = skippedCount;
	}

	public int getErrorCount() {
		return errorCount;
	}

	public void setErrorCount(int errorCount) {
		this.errorCount = errorCount;
	}

	public String getSummaryJson() {
		return summaryJson;
	}

	public void setSummaryJson(String summaryJson) {
		this.summaryJson = summaryJson;
	}

	public String getErrorDetails() {
		return errorDetails;
	}

	public void setErrorDetails(String errorDetails) {
		this.errorDetails = errorDetails;
	}
}
