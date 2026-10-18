package com.afrea.yee.notifications;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.conversations.entity.Conversation;
import com.afrea.yee.conversations.repository.ConversationRepository;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.repository.GroupRepository;
import com.afrea.yee.institutions.entity.Institution;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.notifications.dto.NotificationResponse;
import com.afrea.yee.notifications.entity.Notification;
import com.afrea.yee.notifications.repository.NotificationRepository;
import com.afrea.yee.users.UserTransformer;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class NotificationService {

	private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

	private final NotificationRepository notificationRepository;
	private final UserRepository userRepository;
	private final GroupRepository groupRepository;
	private final InstitutionRepository institutionRepository;
	private final ConversationRepository conversationRepository;
	private final UserTransformer userTransformer;
	private final NotificationRealtimeHub realtimeHub;
	private final WebPushService webPushService;

	public NotificationService(
			NotificationRepository notificationRepository,
			UserRepository userRepository,
			GroupRepository groupRepository,
			InstitutionRepository institutionRepository,
			ConversationRepository conversationRepository,
			UserTransformer userTransformer,
			NotificationRealtimeHub realtimeHub,
			WebPushService webPushService) {
		this.notificationRepository = notificationRepository;
		this.userRepository = userRepository;
		this.groupRepository = groupRepository;
		this.institutionRepository = institutionRepository;
		this.conversationRepository = conversationRepository;
		this.userTransformer = userTransformer;
		this.realtimeHub = realtimeHub;
		this.webPushService = webPushService;
	}

	/**
	 * Insertion isolée dans une transaction neuve (REQUIRES_NEW).
	 * Doit être appelée via le proxy Spring (autres beans / listeners), jamais en
	 * auto-invocation.
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void safeNotify(UUID recipientId, String type, UUID actorId, String subjectType, String subjectId) {
		insertNotification(recipientId, type, actorId, subjectType, subjectId, null);
	}

	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public void safeNotify(
			UUID recipientId,
			String type,
			UUID actorId,
			String subjectType,
			String subjectId,
			String targetId) {
		insertNotification(recipientId, type, actorId, subjectType, subjectId, targetId);
	}

	private void insertNotification(
			UUID recipientId,
			String type,
			UUID actorId,
			String subjectType,
			String subjectId,
			String targetId) {
		try {
			if (recipientId == null || type == null || type.isBlank()) {
				return;
			}
			if (actorId != null && recipientId.equals(actorId)) {
				return;
			}
			Notification n = new Notification();
			n.setUserId(recipientId);
			n.setType(type);
			n.setActorId(actorId);
			n.setSubjectType(subjectType);
			n.setSubjectId(subjectId);
			n.setTargetId(targetId == null || targetId.isBlank() ? null : targetId);
			n.setRead(false);
			notificationRepository.saveAndFlush(n);
			long unread = notificationRepository.countByUserIdAndReadFalse(recipientId);
			Map<String, Object> summary = buildRealtimeSummary(n);
			publishRealtimeAfterCommit(recipientId, unread, summary);
		} catch (Exception ex) {
			log.warn("Notification insert failed type={} recipient={}: {}", type, recipientId, ex.toString());
		}
	}

	/** Résumé léger pour toast / OS — pas le DTO liste complet. */
	private Map<String, Object> buildRealtimeSummary(Notification n) {
		Map<String, Object> summary = new LinkedHashMap<>();
		if (n.getId() != null) {
			summary.put("id", n.getId().toString());
		}
		summary.put("type", n.getType());
		if (n.getTargetId() != null) {
			summary.put("targetId", n.getTargetId());
		}
		if (n.getActorId() != null) {
			User actor = userRepository.findById(n.getActorId()).orElse(null);
			if (actor != null) {
				Map<String, Object> actorMap = new LinkedHashMap<>();
				actorMap.put("id", actor.getId().toString());
				actorMap.put("displayName", actor.getDisplayName());
				actorMap.put("avatarUrl", userTransformer.resolveAvatarUrl(actor));
				summary.put("actor", actorMap);
			} else {
				summary.put("actorId", n.getActorId().toString());
			}
		}
		if (n.getSubjectType() != null && n.getSubjectId() != null) {
			Map<String, Object> subject = new LinkedHashMap<>();
			subject.put("type", n.getSubjectType());
			subject.put("id", n.getSubjectId());
			String name = resolveSubjectName(n.getSubjectType(), n.getSubjectId());
			if (name != null) {
				subject.put("name", name);
			}
			summary.put("subject", subject);
		}
		return summary;
	}

	private String resolveSubjectName(String subjectType, String subjectId) {
		try {
			if ("group".equals(subjectType)) {
				return groupRepository.findById(UUID.fromString(subjectId)).map(GroupEntity::getName).orElse(null);
			}
			if ("institution".equals(subjectType)) {
				return institutionRepository.findById(UUID.fromString(subjectId)).map(Institution::getName).orElse(null);
			}
		} catch (IllegalArgumentException ignored) {
			return null;
		}
		return null;
	}

	private void publishRealtimeAfterCommit(
			UUID recipientId, long unreadCount, Map<String, Object> notificationSummary) {
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
			TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
				@Override
				public void afterCommit() {
					realtimeHub.publishCreated(recipientId, unreadCount, notificationSummary);
					webPushService.sendNotificationPushAsync(recipientId, notificationSummary, unreadCount);
				}
			});
			return;
		}
		realtimeHub.publishCreated(recipientId, unreadCount, notificationSummary);
		webPushService.sendNotificationPushAsync(recipientId, notificationSummary, unreadCount);
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<NotificationResponse>> list(UUID userId, boolean unreadOnly, int page, int perPage) {
		int p = Math.max(1, page);
		int size = Math.min(50, Math.max(1, perPage));
		PageRequest pr = PageRequest.of(p - 1, size);
		Page<Notification> result = unreadOnly
				? notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId, pr)
				: notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pr);

		List<NotificationResponse> data = toResponsesBatch(result.getContent());
		boolean hasNext = result.hasNext();
		boolean hasPrev = result.hasPrevious();
		return ApiResponse.ok(data, Map.of(
				"page", p,
				"perPage", size,
				"total", result.getTotalElements(),
				"totalPages", result.getTotalPages(),
				"hasNext", hasNext,
				"hasPrev", hasPrev));
	}

	@Transactional(readOnly = true)
	public Map<String, Long> unreadCount(UUID userId) {
		return Map.of("count", notificationRepository.countByUserIdAndReadFalse(userId));
	}

	@Transactional
	public Map<String, String> markRead(UUID userId, Long notificationId) {
		Notification n = notificationRepository.findByIdAndUserId(notificationId, userId)
				.orElseThrow(() -> new AppException("not_found", "Notification introuvable.", HttpStatus.NOT_FOUND));
		n.setRead(true);
		return Map.of("message", "ok");
	}

	@Transactional
	public Map<String, String> markAllRead(UUID userId) {
		notificationRepository.markAllRead(userId);
		return Map.of("message", "ok");
	}

	private List<NotificationResponse> toResponsesBatch(List<Notification> notifications) {
		if (notifications.isEmpty()) {
			return List.of();
		}

		Set<UUID> actorIds = new HashSet<>();
		Set<UUID> groupIds = new HashSet<>();
		Set<UUID> institutionIds = new HashSet<>();
		for (Notification n : notifications) {
			if (n.getActorId() != null) {
				actorIds.add(n.getActorId());
			}
			if ("group".equals(n.getSubjectType()) && n.getSubjectId() != null) {
				try {
					groupIds.add(UUID.fromString(n.getSubjectId()));
				} catch (IllegalArgumentException ignored) {
					// ignore malformed
				}
			}
			if ("conversation".equals(n.getSubjectType()) && n.getSubjectId() != null) {
				try {
					conversationRepository.findById(UUID.fromString(n.getSubjectId())).ifPresent(c -> {
						if (c.getGroupId() != null) {
							groupIds.add(c.getGroupId());
						}
					});
				} catch (IllegalArgumentException ignored) {
					// ignore
				}
			}
			if ("institution".equals(n.getSubjectType()) && n.getSubjectId() != null) {
				try {
					institutionIds.add(UUID.fromString(n.getSubjectId()));
				} catch (IllegalArgumentException ignored) {
					// ignore
				}
			}
		}

		Map<UUID, User> actors = new HashMap<>();
		if (!actorIds.isEmpty()) {
			userRepository.findAllById(actorIds).forEach(u -> actors.put(u.getId(), u));
		}
		Map<UUID, GroupEntity> groups = new HashMap<>();
		if (!groupIds.isEmpty()) {
			groupRepository.findAllById(groupIds).forEach(g -> groups.put(g.getId(), g));
		}
		Map<UUID, Institution> institutions = new HashMap<>();
		if (!institutionIds.isEmpty()) {
			institutionRepository.findAllById(institutionIds).forEach(i -> institutions.put(i.getId(), i));
		}

		return notifications.stream().map(n -> {
			NotificationResponse.ActorResponse actor = null;
			User u = n.getActorId() == null ? null : actors.get(n.getActorId());
			if (u != null) {
				actor = new NotificationResponse.ActorResponse(
						u.getId().toString(),
						u.getDisplayName(),
						userTransformer.resolveAvatarUrl(u),
						u.getProfession() == null ? "" : u.getProfession());
			}

			NotificationResponse.SubjectResponse subject = null;
			if (n.getSubjectType() != null && n.getSubjectId() != null) {
				String name = null;
				if ("group".equals(n.getSubjectType())) {
					try {
						GroupEntity g = groups.get(UUID.fromString(n.getSubjectId()));
						name = g == null ? null : g.getName();
					} catch (IllegalArgumentException ignored) {
						name = null;
					}
				} else if ("institution".equals(n.getSubjectType())) {
					try {
						Institution i = institutions.get(UUID.fromString(n.getSubjectId()));
						name = i == null ? null : i.getName();
					} catch (IllegalArgumentException ignored) {
						name = null;
					}
				} else if ("post".equals(n.getSubjectType())) {
					name = null; // volontaire : un post n'a pas de titre
				} else if ("conversation".equals(n.getSubjectType())) {
					try {
						Conversation c = conversationRepository.findById(UUID.fromString(n.getSubjectId())).orElse(null);
						if (c != null && c.getGroupId() != null) {
							GroupEntity g = groups.get(c.getGroupId());
							name = g == null ? null : g.getName();
						}
					} catch (IllegalArgumentException ignored) {
						name = null;
					}
				}
				subject = new NotificationResponse.SubjectResponse(n.getSubjectType(), n.getSubjectId(), name);
			}

			return new NotificationResponse(
					n.getId().toString(),
					n.getType(),
					actor,
					subject,
					n.isRead(),
					n.getCreatedAt().toString(),
					n.getTargetId());
		}).toList();
	}
}
