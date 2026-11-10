package com.afrea.yee.sync;

import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.sync.entity.SyncState;
import com.afrea.yee.sync.repository.SyncStateRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Verrou singleton sur {@link SyncState} pour empêcher deux synchros simultanées. */
@Service
public class SyncLockService {

	public static final Duration STALE_AFTER = Duration.ofMinutes(30);

	private final SyncStateRepository syncStateRepository;

	public SyncLockService(SyncStateRepository syncStateRepository) {
		this.syncStateRepository = syncStateRepository;
	}

	@Transactional
	public String acquire(String requestedOwner) {
		SyncState state = syncStateRepository.findById(SyncState.SINGLETON_ID).orElseGet(() -> {
			SyncState created = new SyncState();
			created.setId(SyncState.SINGLETON_ID);
			return syncStateRepository.save(created);
		});

		Instant now = Instant.now();
		String owner = requestedOwner == null || requestedOwner.isBlank()
				? "sync-" + UUID.randomUUID()
				: requestedOwner;

		if (state.getLockOwner() != null && state.getLockAcquiredAt() != null) {
			boolean stale = state.getLockAcquiredAt().isBefore(now.minus(STALE_AFTER));
			if (!stale && !owner.equals(state.getLockOwner())) {
				throw new AppException(
						"sync_already_running",
						"Une synchronisation AfrEA est déjà en cours.",
						HttpStatus.CONFLICT);
			}
		}

		state.setLockOwner(owner);
		state.setLockAcquiredAt(now);
		syncStateRepository.save(state);
		return owner;
	}

	@Transactional
	public void release(String owner) {
		syncStateRepository.findById(SyncState.SINGLETON_ID).ifPresent(state -> {
			if (owner != null && owner.equals(state.getLockOwner())) {
				state.setLockOwner(null);
				state.setLockAcquiredAt(null);
				syncStateRepository.save(state);
			}
		});
	}

	@Transactional
	public void markLastSync(Instant at) {
		SyncState state = syncStateRepository.findById(SyncState.SINGLETON_ID)
				.orElseThrow(() -> new IllegalStateException("sync_state missing"));
		state.setLastSyncAt(at);
		syncStateRepository.save(state);
	}

	@Transactional(readOnly = true)
	public Instant lastSyncAt() {
		return syncStateRepository.findById(SyncState.SINGLETON_ID)
				.map(SyncState::getLastSyncAt)
				.orElse(null);
	}
}
