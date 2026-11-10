package com.afrea.yee.sync;

import com.afrea.yee.auth.UserAccountStatus;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.institutions.entity.Institution;
import com.afrea.yee.institutions.entity.InstitutionReferent;
import com.afrea.yee.institutions.entity.UserInstitution;
import com.afrea.yee.institutions.repository.InstitutionReferentRepository;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.institutions.repository.UserInstitutionRepository;
import com.afrea.yee.sync.afrea.AfreaFeedClient;
import com.afrea.yee.sync.afrea.AfreaFeedSnapshot;
import com.afrea.yee.sync.afrea.AfreaPersonMapper;
import com.afrea.yee.sync.afrea.dto.AfreaAffiliationDto;
import com.afrea.yee.sync.afrea.dto.AfreaIdsResponseDto;
import com.afrea.yee.sync.afrea.dto.AfreaInstitutionDto;
import com.afrea.yee.sync.afrea.dto.AfreaPersonDto;
import com.afrea.yee.sync.afrea.dto.AfreaReferentDto;
import com.afrea.yee.sync.entity.SyncLog;
import com.afrea.yee.sync.repository.SyncLogRepository;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pipeline miroir AfrEA → AED.
 * Ordre : institutions → users → affiliations → referents → réconciliation ids.
 */
@Service
public class AfreaSyncService {

	private static final Logger log = LoggerFactory.getLogger(AfreaSyncService.class);

	private final AfreaFeedClient feedClient;
	private final AfreaPersonMapper personMapper;
	private final UserMirrorApplier userMirrorApplier;
	private final UserMirrorMatcher userMirrorMatcher;
	private final InstitutionMirrorApplier institutionMirrorApplier;
	private final SyncLockService syncLockService;
	private final SyncLogRepository syncLogRepository;
	private final UserRepository userRepository;
	private final InstitutionRepository institutionRepository;
	private final UserInstitutionRepository userInstitutionRepository;
	private final InstitutionReferentRepository referentRepository;

	public AfreaSyncService(
			AfreaFeedClient feedClient,
			AfreaPersonMapper personMapper,
			UserMirrorApplier userMirrorApplier,
			UserMirrorMatcher userMirrorMatcher,
			InstitutionMirrorApplier institutionMirrorApplier,
			SyncLockService syncLockService,
			SyncLogRepository syncLogRepository,
			UserRepository userRepository,
			InstitutionRepository institutionRepository,
			UserInstitutionRepository userInstitutionRepository,
			InstitutionReferentRepository referentRepository) {
		this.feedClient = feedClient;
		this.personMapper = personMapper;
		this.userMirrorApplier = userMirrorApplier;
		this.userMirrorMatcher = userMirrorMatcher;
		this.institutionMirrorApplier = institutionMirrorApplier;
		this.syncLockService = syncLockService;
		this.syncLogRepository = syncLogRepository;
		this.userRepository = userRepository;
		this.institutionRepository = institutionRepository;
		this.userInstitutionRepository = userInstitutionRepository;
		this.referentRepository = referentRepository;
	}

	/**
	 * @param full si true, ignore {@code lastSyncAt} (relecture complète du feed).
	 */
	@Transactional
	public SyncRunResult run(boolean full) {
		String owner = syncLockService.acquire(null);
		SyncLog syncLog = new SyncLog();
		syncLog.setStartedAt(Instant.now());
		syncLog.setStatus(SyncLog.RUNNING);
		syncLog = syncLogRepository.save(syncLog);

		SyncCounters counters = new SyncCounters();
		Instant generatedAt = null;
		boolean blockingFailure = false;

		try {
			Instant updatedSince = full ? null : syncLockService.lastSyncAt();
			AfreaFeedSnapshot snapshot = feedClient.fetchAll(updatedSince);
			generatedAt = snapshot.generatedAt();

			Map<String, Institution> institutionsByExternal = upsertInstitutions(snapshot.institutions(), counters);
			Map<String, User> usersByExternal = upsertUsers(snapshot.people(), counters);
			upsertAffiliations(snapshot.affiliations(), usersByExternal, institutionsByExternal, counters);
			upsertReferents(snapshot.referents(), usersByExternal, institutionsByExternal, counters);

			AfreaIdsResponseDto ids = feedClient.fetchActiveIds();
			deactivateMissing(ids, counters);

			Instant ended = Instant.now();
			String status = counters.getErrors() == 0 ? SyncLog.SUCCESS : SyncLog.PARTIAL;
			finishLog(syncLog, status, counters, ended, generatedAt, updatedSince, full);
			if (!blockingFailure) {
				syncLockService.markLastSync(generatedAt != null ? generatedAt : ended);
			}
			log.info(
					"AfrEA sync done status={} created={} updated={} skipped={} errors={}",
					status, counters.getCreated(), counters.getUpdated(), counters.getSkipped(), counters.getErrors());
			return new SyncRunResult(
					syncLog.getId(),
					status,
					counters.getCreated(),
					counters.getUpdated(),
					counters.getSkipped(),
					counters.getErrors(),
					generatedAt,
					ended);
		} catch (RuntimeException ex) {
			blockingFailure = true;
			counters.error("blocking:" + ex.getClass().getSimpleName());
			Instant ended = Instant.now();
			finishLog(syncLog, SyncLog.FAILED, counters, ended, generatedAt, null, full);
			log.warn("AfrEA sync failed: {}", ex.toString());
			throw ex;
		} finally {
			syncLockService.release(owner);
		}
	}

	private Map<String, Institution> upsertInstitutions(List<AfreaInstitutionDto> dtos, SyncCounters counters) {
		Map<String, Institution> byExternal = new HashMap<>();
		List<AfreaInstitutionDto> ordered = dtos.stream()
				.sorted(Comparator.comparingInt(d -> InstitutionMirrorApplier.typeOrder(d.type())))
				.toList();

		for (AfreaInstitutionDto dto : ordered) {
			try {
				if (dto.externalId() == null || dto.externalId().isBlank()) {
					counters.skipped();
					counters.error("institution: missing externalId");
					continue;
				}
				String externalId = dto.externalId().trim();
				Institution parent = null;
				if (dto.parentExternalId() != null && !dto.parentExternalId().isBlank()) {
					parent = byExternal.get(dto.parentExternalId().trim());
					if (parent == null) {
						parent = institutionRepository.findByExternalId(dto.parentExternalId().trim()).orElse(null);
					}
					if (parent == null) {
						counters.skipped();
						counters.error("institution:" + externalId + ": parent missing");
						continue;
					}
				}

				Optional<Institution> existing = institutionRepository.findByExternalId(externalId);
				boolean isNew = existing.isEmpty();
				Institution institution = existing.orElseGet(Institution::new);
				institutionMirrorApplier.applySyncedFields(institution, dto, parent, isNew);
				institutionRepository.save(institution);
				byExternal.put(externalId, institution);
				if (isNew) {
					counters.created();
				} else {
					counters.updated();
				}
			} catch (RuntimeException ex) {
				counters.skipped();
				counters.error("institution:" + safeId(dto.externalId()) + ":" + ex.getClass().getSimpleName());
			}
		}
		return byExternal;
	}

	private Map<String, User> upsertUsers(List<AfreaPersonDto> people, SyncCounters counters) {
		Map<String, User> byExternal = new HashMap<>();
		Instant now = Instant.now();

		for (AfreaPersonDto person : people) {
			try {
				if (person.externalId() == null || person.externalId().isBlank()) {
					counters.skipped();
					counters.error("user: missing externalId");
					continue;
				}
				if (person.email() == null || person.email().isBlank()) {
					counters.skipped();
					counters.error("user:" + person.externalId().trim() + ": missing email");
					continue;
				}
				String externalId = person.externalId().trim();
				Optional<User> existing = userMirrorMatcher.findExisting(externalId, person.email());
				boolean isNew = existing.isEmpty();
				User user = existing.orElseGet(User::new);

				if (isNew) {
					user.setStatus(UserAccountStatus.A_VERIFIER);
					user.setPasswordHash(null);
					user.setEmailVerified(false);
					user.setDisplayName(
							person.displayName() == null || person.displayName().isBlank()
									? "Member"
									: person.displayName().trim());
				}

				user.setExternalId(externalId);
				SyncedUserFields fields = personMapper.toSyncedFields(person);
				userMirrorApplier.applySyncedFields(user, fields, now);

				// Ne pas réactiver un compte DESACTIVE localement via simple upsert
				// (la réconciliation ids gère la désactivation ; un retour dans le feed
				// le remet à A_VERIFIER seulement s'il n'a toujours pas de mot de passe).
				if (!isNew
						&& UserAccountStatus.DESACTIVE.equals(user.getStatus())
						&& user.getPasswordHash() == null) {
					user.setStatus(UserAccountStatus.A_VERIFIER);
					user.setAccountDeactivated(false);
					user.setDeactivatedAt(null);
					user.setDeletedAt(null);
				}

				userRepository.save(user);
				if (isNew || user.getMentionName() == null || user.getMentionName().isBlank()) {
					user.setMentionName(UserTransformer.slugifyMention(user.getDisplayName(), user.getId()));
					userRepository.save(user);
				}

				byExternal.put(externalId, user);
				if (isNew) {
					counters.created();
				} else {
					counters.updated();
				}
			} catch (RuntimeException ex) {
				counters.skipped();
				counters.error("user:" + safeId(person.externalId()) + ":" + ex.getClass().getSimpleName());
			}
		}
		return byExternal;
	}

	private void upsertAffiliations(
			List<AfreaAffiliationDto> affiliations,
			Map<String, User> usersByExternal,
			Map<String, Institution> institutionsByExternal,
			SyncCounters counters) {
		for (AfreaAffiliationDto dto : affiliations) {
			try {
				User user = resolveUser(dto.userExternalId(), usersByExternal);
				Institution institution = resolveInstitution(dto.institutionExternalId(), institutionsByExternal);
				if (user == null || institution == null) {
					counters.skipped();
					counters.error("affiliation: missing user or institution");
					continue;
				}
				String status = normalizeAffiliationStatus(dto.status());
				if (status == null) {
					counters.skipped();
					counters.error("affiliation: invalid status");
					continue;
				}

				Optional<UserInstitution> existing =
						userInstitutionRepository.findByInstitutionIdAndUserId(institution.getId(), user.getId());
				if (existing.isPresent()) {
					UserInstitution ui = existing.get();
					if (!status.equals(ui.getStatus())) {
						ui.setStatus(status);
						userInstitutionRepository.save(ui);
						counters.updated();
					} else {
						counters.skipped();
					}
				} else {
					UserInstitution ui = new UserInstitution();
					ui.setUser(user);
					ui.setInstitution(institution);
					ui.setStatus(status);
					userInstitutionRepository.save(ui);
					if ("active".equals(status)) {
						institution.setMembersCount(institution.getMembersCount() + 1);
						institutionRepository.save(institution);
					}
					counters.created();
				}
			} catch (RuntimeException ex) {
				counters.skipped();
				counters.error("affiliation:" + ex.getClass().getSimpleName());
			}
		}
	}

	private void upsertReferents(
			List<AfreaReferentDto> referents,
			Map<String, User> usersByExternal,
			Map<String, Institution> institutionsByExternal,
			SyncCounters counters) {
		for (AfreaReferentDto dto : referents) {
			try {
				User user = resolveUser(dto.userExternalId(), usersByExternal);
				Institution institution = resolveInstitution(dto.institutionExternalId(), institutionsByExternal);
				if (user == null || institution == null) {
					counters.skipped();
					counters.error("referent: missing user or institution");
					continue;
				}
				if (referentRepository.existsByInstitutionIdAndUserId(institution.getId(), user.getId())) {
					counters.skipped();
					continue;
				}
				InstitutionReferent referent = new InstitutionReferent();
				referent.setInstitution(institution);
				referent.setUser(user);
				referentRepository.save(referent);
				counters.created();
			} catch (RuntimeException ex) {
				counters.skipped();
				counters.error("referent:" + ex.getClass().getSimpleName());
			}
		}
	}

	private void deactivateMissing(AfreaIdsResponseDto idsResponse, SyncCounters counters) {
		Set<String> active = new HashSet<>();
		for (String id : idsResponse.idsOrEmpty()) {
			if (id != null && !id.isBlank()) {
				active.add(id.trim());
			}
		}
		Instant now = Instant.now();
		for (User user : userRepository.findByExternalIdIsNotNull()) {
			String ext = user.getExternalId();
			if (ext == null || active.contains(ext)) {
				continue;
			}
			if (UserAccountStatus.DESACTIVE.equals(user.getStatus()) && user.isAccountDeactivated()) {
				counters.skipped();
				continue;
			}
			user.setStatus(UserAccountStatus.DESACTIVE);
			user.setAccountDeactivated(true);
			if (user.getDeactivatedAt() == null) {
				user.setDeactivatedAt(now);
			}
			user.setDeletedAt(now);
			userRepository.save(user);
			counters.updated();
		}
	}

	private User resolveUser(String externalId, Map<String, User> cache) {
		if (externalId == null || externalId.isBlank()) {
			return null;
		}
		String id = externalId.trim();
		User cached = cache.get(id);
		if (cached != null) {
			return cached;
		}
		return userRepository.findByExternalId(id).orElse(null);
	}

	private Institution resolveInstitution(String externalId, Map<String, Institution> cache) {
		if (externalId == null || externalId.isBlank()) {
			return null;
		}
		String id = externalId.trim();
		Institution cached = cache.get(id);
		if (cached != null) {
			return cached;
		}
		return institutionRepository.findByExternalId(id).orElse(null);
	}

	private static String normalizeAffiliationStatus(String status) {
		if (status == null || status.isBlank()) {
			return null;
		}
		String s = status.trim().toLowerCase(Locale.ROOT);
		if ("active".equals(s) || "inactive".equals(s)) {
			return s;
		}
		return null;
	}

	private void finishLog(
			SyncLog syncLog,
			String status,
			SyncCounters counters,
			Instant ended,
			Instant generatedAt,
			Instant updatedSince,
			boolean full) {
		syncLog.setEndedAt(ended);
		syncLog.setStatus(status);
		syncLog.setCreatedCount(counters.getCreated());
		syncLog.setUpdatedCount(counters.getUpdated());
		syncLog.setSkippedCount(counters.getSkipped());
		syncLog.setErrorCount(counters.getErrors());
		syncLog.setSummaryJson(
				"{\"full\":" + full
						+ ",\"updatedSince\":"
						+ (updatedSince == null ? "null" : "\"" + updatedSince + "\"")
						+ ",\"generatedAt\":"
						+ (generatedAt == null ? "null" : "\"" + generatedAt + "\"")
						+ "}");
		syncLog.setErrorDetails(counters.errorDetailsAsText());
		syncLogRepository.save(syncLog);
	}

	private static String safeId(String id) {
		if (id == null || id.isBlank()) {
			return "?";
		}
		String t = id.trim();
		return t.length() <= 32 ? t : t.substring(0, 32);
	}
}
