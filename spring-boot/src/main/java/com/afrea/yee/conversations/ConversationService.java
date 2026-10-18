package com.afrea.yee.conversations;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.api.ApiResponse;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.conversations.dto.ConversationParticipantResponse;
import com.afrea.yee.conversations.dto.ConversationResponse;
import com.afrea.yee.conversations.dto.ConversationSearchResponse;
import com.afrea.yee.conversations.dto.MessageMediaResponse;
import com.afrea.yee.conversations.dto.MessageResponse;
import com.afrea.yee.conversations.dto.MessageSearchHitResponse;
import com.afrea.yee.conversations.entity.Conversation;
import com.afrea.yee.conversations.entity.ConversationMessage;
import com.afrea.yee.conversations.entity.ConversationMessageMedia;
import com.afrea.yee.conversations.entity.ConversationParticipant;
import com.afrea.yee.conversations.repository.ConversationMessageMediaRepository;
import com.afrea.yee.conversations.repository.ConversationMessageRepository;
import com.afrea.yee.conversations.repository.ConversationParticipantRepository;
import com.afrea.yee.conversations.repository.ConversationRepository;
import com.afrea.yee.feed.HtmlContentSanitizer;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.entity.GroupMember;
import com.afrea.yee.groups.repository.GroupMemberRepository;
import com.afrea.yee.groups.repository.GroupRepository;
import com.afrea.yee.media.AudioSafariCompat;
import com.afrea.yee.media.AudioUploadValidator;
import com.afrea.yee.media.ImageUploadValidator;
import com.afrea.yee.media.ObjectStorage;
import com.afrea.yee.media.StoredObject;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.jsoup.Jsoup;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

@Service
public class ConversationService {

	private static final int MAX_IMAGES = 4;

	private final ConversationRepository conversationRepository;
	private final ConversationParticipantRepository participantRepository;
	private final ConversationMessageRepository messageRepository;
	private final ConversationMessageMediaRepository mediaRepository;
	private final UserRepository userRepository;
	private final GroupRepository groupRepository;
	private final GroupMemberRepository groupMemberRepository;
	private final ConversationPermissions permissions;
	private final UserTransformer userTransformer;
	private final HtmlContentSanitizer htmlContentSanitizer;
	private final WriteRateLimit writeRateLimit;
	private final ImageUploadValidator imageUploadValidator;
	private final AudioUploadValidator audioUploadValidator;
	private final AudioSafariCompat audioSafariCompat;
	private final ObjectStorage objectStorage;
	private final ApplicationEventPublisher events;

	public ConversationService(
			ConversationRepository conversationRepository,
			ConversationParticipantRepository participantRepository,
			ConversationMessageRepository messageRepository,
			ConversationMessageMediaRepository mediaRepository,
			UserRepository userRepository,
			GroupRepository groupRepository,
			GroupMemberRepository groupMemberRepository,
			ConversationPermissions permissions,
			UserTransformer userTransformer,
			HtmlContentSanitizer htmlContentSanitizer,
			WriteRateLimit writeRateLimit,
			ImageUploadValidator imageUploadValidator,
			AudioUploadValidator audioUploadValidator,
			AudioSafariCompat audioSafariCompat,
			ObjectStorage objectStorage,
			ApplicationEventPublisher events) {
		this.conversationRepository = conversationRepository;
		this.participantRepository = participantRepository;
		this.messageRepository = messageRepository;
		this.mediaRepository = mediaRepository;
		this.userRepository = userRepository;
		this.groupRepository = groupRepository;
		this.groupMemberRepository = groupMemberRepository;
		this.permissions = permissions;
		this.userTransformer = userTransformer;
		this.htmlContentSanitizer = htmlContentSanitizer;
		this.writeRateLimit = writeRateLimit;
		this.imageUploadValidator = imageUploadValidator;
		this.audioUploadValidator = audioUploadValidator;
		this.audioSafariCompat = audioSafariCompat;
		this.objectStorage = objectStorage;
		this.events = events;
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<ConversationResponse>> listInbox(UUID userId, int page, int perPage) {
		int p = Math.max(1, page);
		int size = Math.min(50, Math.max(1, perPage));
		Page<Conversation> result = conversationRepository.findInbox(userId, PageRequest.of(p - 1, size));
		List<ConversationResponse> data = toConversationResponses(result.getContent(), userId, false);
		return ApiResponse.ok(data, pageMeta(p, size, result));
	}

	@Transactional(readOnly = true)
	public Map<String, Long> unreadCount(UUID userId) {
		return Map.of(
				"count", messageRepository.countUnreadThreads(userId),
				"messages", messageRepository.countUnreadMessages(userId));
	}

	@Transactional(readOnly = true)
	public ConversationResponse get(UUID userId, UUID conversationId) {
		Conversation conversation = requireConversation(conversationId);
		permissions.requireAccess(conversation, userId);
		ensureParticipant(conversation, userId);
		return toConversationResponses(List.of(conversation), userId, false).getFirst();
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<MessageResponse>> listMessages(UUID userId, UUID conversationId, int page, int perPage) {
		Conversation conversation = requireConversation(conversationId);
		permissions.requireAccess(conversation, userId);
		ConversationParticipant me = ensureParticipant(conversation, userId);
		Instant visibleFrom = visibleFrom(userId, me);
		int p = Math.max(1, page);
		int size = Math.min(50, Math.max(1, perPage));
		Page<ConversationMessage> result = messageRepository.findVisiblePage(
				conversationId, visibleFrom, PageRequest.of(p - 1, size));
		List<ConversationMessage> chronological = new ArrayList<>(result.getContent());
		chronological.sort(Comparator.comparing(ConversationMessage::getCreatedAt));
		return ApiResponse.ok(toMessageResponses(chronological, userId, conversation), pageMeta(p, size, result));
	}

	@Transactional
	public ConversationResponse createOrGetDm(UUID senderId, JsonNode body) {
		UUID recipientId = readUuid(body, "recipientId");
		if (recipientId == null) {
			throw validation("recipientId", "Destinataire requis.");
		}
		User recipient = userRepository.findById(recipientId)
				.filter(u -> !u.isAccountDeleted() && !u.isAccountDeactivated())
				.orElseThrow(() -> new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
		permissions.requireCanMessage(senderId, recipient);

		Conversation conversation = conversationRepository.findDmBetween(senderId, recipientId)
				.orElseGet(() -> createDm(senderId, recipientId));
		participantRepository.findByConversationIdAndUserId(conversation.getId(), senderId)
				.ifPresent(this::unhideParticipant);

		String content = readString(body, "content");
		if (content != null && !content.isBlank()) {
			sendMessage(senderId, conversation.getId(), content, List.of(), null);
			conversation = requireConversation(conversation.getId());
		}
		return toConversationResponses(List.of(conversation), senderId, true).getFirst();
	}

	@Transactional
	public ConversationResponse getOrCreateGroupConversation(UUID userId, UUID groupId) {
		GroupEntity group = permissions.requireActiveGroup(groupId, userId);
		Conversation conversation = conversationRepository.findByGroupId(groupId).orElseGet(() -> {
			Conversation created = new Conversation();
			created.setType("group");
			created.setGroupId(groupId);
			return conversationRepository.save(created);
		});
		syncGroupParticipants(conversation, group);
		ConversationParticipant me = ensureParticipant(conversation, userId);
		unhideParticipant(me);
		return toConversationResponses(List.of(conversation), userId, false).getFirst();
	}

	@Transactional
	public MessageResponse sendMessage(
			UUID senderId,
			UUID conversationId,
			String rawContent,
			List<MultipartFile> images,
			MultipartFile audio) {
		writeRateLimit.checkSendMessage(senderId);
		Conversation conversation = requireConversation(conversationId);
		permissions.requireAccess(conversation, senderId);
		ConversationParticipant me = ensureParticipant(conversation, senderId);

		if (conversation.isGroup()) {
			permissions.requireActiveGroup(conversation.getGroupId(), senderId);
		} else {
			assertCanStillMessagePeer(senderId, conversation);
		}

		List<MultipartFile> imageFiles = images == null ? List.of() : images.stream()
				.filter(f -> f != null && !f.isEmpty())
				.toList();
		boolean hasAudio = audio != null && !audio.isEmpty();
		if (!imageFiles.isEmpty() && hasAudio) {
			throw new AppException(
					"mixed_media_not_allowed",
					"Images et audio ne peuvent pas être mélangés.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		if (imageFiles.size() > MAX_IMAGES) {
			throw validation("media", "4 images maximum.");
		}

		String sanitized = htmlContentSanitizer.sanitize(rawContent);
		int plainLen = htmlContentSanitizer.plainLength(sanitized);
		if (plainLen > HtmlContentSanitizer.MAX_PLAIN_LENGTH) {
			throw validation("content", "3000 caractères maximum.");
		}
		if (plainLen == 0 && imageFiles.isEmpty() && !hasAudio) {
			throw validation("content", "Contenu ou média requis.");
		}

		List<PreparedMedia> prepared = prepareMedia(imageFiles, audio, hasAudio);

		ConversationMessage message = new ConversationMessage();
		message.setConversation(conversation);
		message.setSenderId(senderId);
		message.setBody(sanitized);
		messageRepository.save(message);

		int order = 0;
		for (PreparedMedia pm : prepared) {
			String path = conversation.getId() + "/" + UUID.randomUUID() + "." + pm.extension();
			StoredObject stored = objectStorage.upload("chat-media", path, pm.bytes(), pm.contentType());
			ConversationMessageMedia media = new ConversationMessageMedia();
			media.setMessage(message);
			media.setMediaType(pm.type());
			// Valeur provisoire : l'id n'existe qu'après le save, puis on pose le chemin d'API.
			media.setUrl("pending");
			media.setStoragePath(stored.path());
			media.setSortOrder(order++);
			mediaRepository.save(media);
			media.setUrl(ChatMediaLinks.apiPath(conversation.getId(), media.getId()));
		}

		conversation.setUpdatedAt(Instant.now());
		me.setLastReadAt(message.getCreatedAt());
		// Réaffiche la discussion pour tous les participants qui l’avaient masquée.
		unhideConversationParticipants(conversation.getId());

		List<UUID> others = participantRepository.findUserIdsByConversationId(conversation.getId()).stream()
				.filter(id -> !id.equals(senderId))
				.toList();
		String preview = previewOf(sanitized, !prepared.isEmpty());
		events.publishEvent(new MessageSentEvent(
				conversation.getId(),
				message.getId(),
				senderId,
				others,
				preview,
				sanitized == null ? "" : sanitized,
				!prepared.isEmpty(),
				conversation.getType(),
				conversation.getGroupId(),
				message.getCreatedAt()));

		return toMessageResponses(List.of(message), senderId, conversation).getFirst();
	}

	/**
	 * Soft-delete « pour tous » — seul l’auteur peut supprimer ; tombstone conservé.
	 */
	@Transactional
	public Map<String, String> deleteMessage(UUID userId, UUID conversationId, Long messageId) {
		Conversation conversation = requireConversation(conversationId);
		permissions.requireAccess(conversation, userId);
		ConversationMessage message = messageRepository.findByIdAndConversationId(messageId, conversationId)
				.orElseThrow(() -> new AppException("not_found", "Message introuvable.", HttpStatus.NOT_FOUND));
		if (!message.getSenderId().equals(userId) && !permissions.isSiteAdmin(userId)) {
			throw new AppException("forbidden", "Seul l’auteur peut supprimer ce message.", HttpStatus.FORBIDDEN);
		}
		if (message.getDeletedAt() != null) {
			return Map.of("message", "Message déjà supprimé.");
		}
		message.setDeletedAt(Instant.now());
		message.setBody("");
		List<UUID> participants = participantRepository.findUserIdsByConversationId(conversationId);
		events.publishEvent(new MessageDeletedEvent(conversationId, messageId, userId, participants));
		conversation.setUpdatedAt(Instant.now());
		return Map.of("message", "Message supprimé.");
	}

	/**
	 * Supprimer pour moi : masque la conversation et coupe l’historique visible
	 * (joined_at = now → visibleFrom).
	 */
	@Transactional
	public Map<String, String> hideForMe(UUID userId, UUID conversationId) {
		Conversation conversation = requireConversation(conversationId);
		permissions.requireAccess(conversation, userId);
		ConversationParticipant me = ensureParticipant(conversation, userId);
		Instant now = Instant.now();
		me.setHiddenAt(now);
		me.setJoinedAt(now);
		me.setLastReadAt(now);
		return Map.of("message", "Conversation supprimée.");
	}

	private void unhideConversationParticipants(UUID conversationId) {
		for (ConversationParticipant p : participantRepository.findByConversationId(conversationId)) {
			if (p.getHiddenAt() != null) {
				p.setHiddenAt(null);
			}
		}
	}

	private void unhideParticipant(ConversationParticipant participant) {
		if (participant != null && participant.getHiddenAt() != null) {
			participant.setHiddenAt(null);
		}
	}

	@Transactional
	public Map<String, String> markRead(UUID userId, UUID conversationId) {
		Conversation conversation = requireConversation(conversationId);
		permissions.requireAccess(conversation, userId);
		ConversationParticipant me = ensureParticipant(conversation, userId);
		Instant now = Instant.now();
		me.setLastReadAt(now);
		List<UUID> others = participantRepository.findUserIdsByConversationId(conversationId).stream()
				.filter(id -> !id.equals(userId))
				.toList();
		events.publishEvent(new MessageReadEvent(conversationId, userId, now, others));
		return Map.of("message", "ok");
	}

	@Transactional(readOnly = true)
	public ConversationSearchResponse search(UUID userId, String rawQuery, int page, int perPage) {
		String q = rawQuery == null ? "" : rawQuery.trim();
		if (q.length() < 2) {
			return new ConversationSearchResponse(List.of(), List.of());
		}
		int size = Math.min(20, Math.max(1, perPage));
		PageRequest pr = PageRequest.of(0, size);

		LinkedHashSet<UUID> conversationIds = new LinkedHashSet<>();
		conversationRepository.searchDmByParticipantName(userId, q, pr)
				.forEach(c -> conversationIds.add(c.getId()));
		conversationRepository.searchGroupByName(userId, q, pr)
				.forEach(c -> conversationIds.add(c.getId()));

		List<Conversation> found = new ArrayList<>(
				conversationIds.isEmpty()
						? List.of()
						: conversationRepository.findAllByIdIn(conversationIds));
		found.sort(Comparator.comparing(Conversation::getUpdatedAt).reversed());

		Page<ConversationMessage> hits = messageRepository.searchBody(userId, q, PageRequest.of(Math.max(0, page - 1), size));
		Map<UUID, Conversation> byId = new HashMap<>();
		hits.getContent().forEach(m -> byId.put(m.getConversation().getId(), m.getConversation()));
		found.forEach(c -> byId.put(c.getId(), c));

		Map<UUID, ConversationResponse> mapped = new HashMap<>();
		toConversationResponses(new ArrayList<>(byId.values()), userId, false)
				.forEach(r -> mapped.put(UUID.fromString(r.id()), r));

		List<ConversationResponse> conversations = found.stream()
				.map(c -> mapped.get(c.getId()))
				.filter(r -> r != null)
				.toList();

		List<MessageSearchHitResponse> messages = new ArrayList<>();
		List<MessageResponse> messageDtos = toMessageResponses(hits.getContent(), userId, null);
		Map<Long, MessageResponse> byMessageId = new HashMap<>();
		messageDtos.forEach(m -> byMessageId.put(Long.valueOf(m.id()), m));
		for (ConversationMessage m : hits.getContent()) {
			ConversationResponse parent = mapped.get(m.getConversation().getId());
			MessageResponse dto = byMessageId.get(m.getId());
			if (parent == null || dto == null) {
				continue;
			}
			messages.add(new MessageSearchHitResponse(parent.id(), parent.subject(), parent.isGroup(), dto));
		}
		return new ConversationSearchResponse(conversations, messages);
	}

	@Transactional(readOnly = true)
	public ApiResponse<List<ConversationResponse>> adminListForUser(UUID userId, int page, int perPage) {
		int p = Math.max(1, page);
		int size = Math.min(50, Math.max(1, perPage));
		List<Conversation> list = conversationRepository.findAllForUser(userId, PageRequest.of(p - 1, size));
		return ApiResponse.ok(toConversationResponses(list, userId, false), Map.of("page", p, "perPage", size));
	}

	@Transactional
	public Map<String, String> adminDelete(UUID conversationId) {
		Conversation conversation = requireConversation(conversationId);
		conversationRepository.delete(conversation);
		return Map.of("message", "Conversation supprimée.");
	}

	@Transactional
	public int purgeOlderThan(Instant cutoff) {
		return messageRepository.deleteOlderThan(cutoff);
	}

	private Conversation createDm(UUID userA, UUID userB) {
		Conversation conversation = new Conversation();
		conversation.setType("dm");
		conversationRepository.save(conversation);
		addParticipant(conversation, userA, Instant.now());
		addParticipant(conversation, userB, Instant.now());
		return conversation;
	}

	private void syncGroupParticipants(Conversation conversation, GroupEntity group) {
		List<GroupMember> members = groupMemberRepository.findByGroupAndOptionalStatus(group.getId(), "active");
		Set<UUID> existing = new HashSet<>(participantRepository.findUserIdsByConversationId(conversation.getId()));
		for (GroupMember member : members) {
			UUID uid = member.getUser().getId();
			if (existing.contains(uid)) {
				continue;
			}
			Instant joined = member.getCreatedAt() == null ? Instant.now() : member.getCreatedAt();
			addParticipant(conversation, uid, joined);
		}
	}

	private ConversationParticipant ensureParticipant(Conversation conversation, UUID userId) {
		return participantRepository.findByConversationIdAndUserId(conversation.getId(), userId)
				.orElseGet(() -> {
					if (conversation.isGroup()) {
						GroupMember membership = groupMemberRepository
								.findByGroupIdAndUserId(conversation.getGroupId(), userId)
								.orElse(null);
						Instant joined = membership != null && membership.getCreatedAt() != null
								? membership.getCreatedAt()
								: Instant.now();
						if (permissions.isSiteAdmin(userId) && membership == null) {
							joined = Instant.EPOCH;
						}
						return addParticipant(conversation, userId, joined);
					}
					if (permissions.isSiteAdmin(userId)) {
						return addParticipant(conversation, userId, Instant.EPOCH);
					}
					throw new AppException("not_found", "Conversation introuvable.", HttpStatus.NOT_FOUND);
				});
	}

	private ConversationParticipant addParticipant(Conversation conversation, UUID userId, Instant joinedAt) {
		ConversationParticipant p = new ConversationParticipant();
		p.setConversation(conversation);
		p.setUserId(userId);
		p.setJoinedAt(joinedAt);
		return participantRepository.save(p);
	}

	private void assertCanStillMessagePeer(UUID senderId, Conversation conversation) {
		List<UUID> ids = participantRepository.findUserIdsByConversationId(conversation.getId());
		UUID otherId = ids.stream().filter(id -> !id.equals(senderId)).findFirst().orElse(null);
		if (otherId == null) {
			return;
		}
		User other = userRepository.findById(otherId).orElse(null);
		permissions.requireCanMessage(senderId, other);
	}

	private Instant visibleFrom(UUID userId, ConversationParticipant me) {
		if (permissions.isSiteAdmin(userId)) {
			return Instant.EPOCH;
		}
		return me.getJoinedAt() == null ? Instant.EPOCH : me.getJoinedAt();
	}

	private Conversation requireConversation(UUID id) {
		return conversationRepository.findById(id)
				.orElseThrow(() -> new AppException("not_found", "Conversation introuvable.", HttpStatus.NOT_FOUND));
	}

	private List<ConversationResponse> toConversationResponses(
			List<Conversation> conversations,
			UUID viewerId,
			boolean includeMessages) {
		if (conversations.isEmpty()) {
			return List.of();
		}
		List<UUID> ids = conversations.stream().map(Conversation::getId).toList();
		List<ConversationParticipant> participants = participantRepository.findByConversationIdIn(ids);
		Map<UUID, List<ConversationParticipant>> byConv = new HashMap<>();
		Set<UUID> userIds = new HashSet<>();
		Set<UUID> groupIds = new HashSet<>();
		for (ConversationParticipant p : participants) {
			byConv.computeIfAbsent(p.getConversation().getId(), k -> new ArrayList<>()).add(p);
			userIds.add(p.getUserId());
		}
		for (Conversation c : conversations) {
			if (c.getGroupId() != null) {
				groupIds.add(c.getGroupId());
			}
		}
		List<ConversationMessage> latest = messageRepository.findLatestForConversations(ids);
		Map<UUID, ConversationMessage> latestByConv = new HashMap<>();
		for (ConversationMessage m : latest) {
			latestByConv.putIfAbsent(m.getConversation().getId(), m);
			userIds.add(m.getSenderId());
		}
		Map<UUID, User> users = new HashMap<>();
		if (!userIds.isEmpty()) {
			userRepository.findAllById(userIds).forEach(u -> users.put(u.getId(), u));
		}
		Map<UUID, GroupEntity> groups = new HashMap<>();
		if (!groupIds.isEmpty()) {
			groupRepository.findAllById(groupIds).forEach(g -> groups.put(g.getId(), g));
		}

		Map<UUID, MessageResponse> latestDto = new HashMap<>();
		if (!latest.isEmpty()) {
			toMessageResponses(latest, viewerId, null).forEach(dto ->
					latestDto.put(UUID.fromString(dto.conversationId()), dto));
		}

		List<ConversationResponse> out = new ArrayList<>();
		for (Conversation c : conversations) {
			List<ConversationParticipant> parts = byConv.getOrDefault(c.getId(), List.of());
			ConversationParticipant me = parts.stream()
					.filter(p -> p.getUserId().equals(viewerId))
					.findFirst()
					.orElse(null);
			Instant visible = me == null ? Instant.EPOCH : visibleFrom(viewerId, me);
			Instant lastRead = me == null || me.getLastReadAt() == null ? Instant.EPOCH : me.getLastReadAt();
			long unread = messageRepository.countUnreadInConversation(
					c.getId(), viewerId, visible, lastRead);

			List<ConversationParticipantResponse> participantDtos = parts.stream()
					.filter(p -> !p.getUserId().equals(viewerId))
					.map(p -> toParticipant(users.get(p.getUserId())))
					.filter(r -> r != null)
					.toList();

			GroupEntity group = c.getGroupId() == null ? null : groups.get(c.getGroupId());
			String groupName = group == null ? null : group.getName();
			String subject = c.isGroup()
					? (groupName == null ? "Groupe" : groupName)
					: participantDtos.stream()
							.map(ConversationParticipantResponse::displayName)
							.findFirst()
							.orElse("Conversation");

			List<MessageResponse> messages = List.of();
			if (includeMessages) {
				List<ConversationMessage> recent = new ArrayList<>(
						messageRepository.findLatest(c.getId(), PageRequest.of(0, 30)));
				recent.sort(Comparator.comparing(ConversationMessage::getCreatedAt));
				messages = toMessageResponses(recent, viewerId, c);
			}

			out.add(new ConversationResponse(
					c.getId().toString(),
					c.getType(),
					subject,
					c.getGroupId() == null ? null : c.getGroupId().toString(),
					groupName,
					c.isGroup(),
					participantDtos,
					latestDto.get(c.getId()),
					unread > 0,
					unread,
					c.getUpdatedAt() == null ? null : c.getUpdatedAt().toString(),
					messages));
		}
		return out;
	}

	private List<MessageResponse> toMessageResponses(
			List<ConversationMessage> messages,
			UUID viewerId,
			Conversation conversationHint) {
		if (messages.isEmpty()) {
			return List.of();
		}
		List<Long> ids = messages.stream().map(ConversationMessage::getId).toList();
		Map<Long, List<ConversationMessageMedia>> mediaByMsg = new HashMap<>();
		for (ConversationMessageMedia media : mediaRepository.findForMessages(ids)) {
			mediaByMsg.computeIfAbsent(media.getMessage().getId(), k -> new ArrayList<>()).add(media);
		}
		Set<UUID> senderIds = new HashSet<>();
		Set<UUID> conversationIds = new HashSet<>();
		messages.forEach(m -> {
			senderIds.add(m.getSenderId());
			conversationIds.add(m.getConversation().getId());
		});
		Map<UUID, User> senders = new HashMap<>();
		userRepository.findAllById(senderIds).forEach(u -> senders.put(u.getId(), u));

		Map<UUID, List<ConversationParticipant>> partsByConv = new HashMap<>();
		participantRepository.findByConversationIdIn(conversationIds)
				.forEach(p -> partsByConv.computeIfAbsent(p.getConversation().getId(), k -> new ArrayList<>()).add(p));

		List<MessageResponse> out = new ArrayList<>();
		for (ConversationMessage m : messages) {
			UUID convId = m.getConversation().getId();
			boolean group = conversationHint != null
					? conversationHint.isGroup()
					: m.getConversation().isGroup();
			List<ConversationParticipant> parts = partsByConv.getOrDefault(convId, List.of());
			int seenCount = 0;
			boolean seen = false;
			for (ConversationParticipant p : parts) {
				if (p.getUserId().equals(m.getSenderId())) {
					continue;
				}
				if (p.getLastReadAt() != null && !p.getLastReadAt().isBefore(m.getCreatedAt())) {
					seenCount++;
					seen = true;
				}
			}
			if (!group) {
				seen = seenCount > 0;
			}
			User sender = senders.get(m.getSenderId());
			boolean deleted = m.isDeleted();
			List<MessageMediaResponse> media = deleted
					? List.of()
					: mediaByMsg.getOrDefault(m.getId(), List.of()).stream()
							.map(x -> new MessageMediaResponse(
									x.getId().toString(),
									x.getMediaType(),
									ChatMediaLinks.apiPath(convId, x.getId())))
							.toList();
			String content = deleted ? "" : htmlContentSanitizer.sanitize(m.getBody());
			out.add(new MessageResponse(
					m.getId().toString(),
					convId.toString(),
					m.getSenderId().toString(),
					sender == null ? "" : sender.getDisplayName(),
					sender == null ? null : userTransformer.resolveAvatarUrl(sender),
					content,
					media,
					m.getCreatedAt().toString(),
					viewerId != null && viewerId.equals(m.getSenderId()),
					seen,
					seenCount,
					deleted));
		}
		return out;
	}

	private ConversationParticipantResponse toParticipant(User user) {
		if (user == null || user.isAccountDeleted()) {
			return null;
		}
		return new ConversationParticipantResponse(
				user.getId().toString(),
				user.getDisplayName(),
				userTransformer.resolveAvatarUrl(user));
	}

	private List<PreparedMedia> prepareMedia(List<MultipartFile> imageFiles, MultipartFile audio, boolean hasAudio) {
		List<PreparedMedia> prepared = new ArrayList<>();
		if (hasAudio) {
			AudioUploadValidator.ValidatedAudio v =
					audioSafariCompat.ensurePlayable(audioUploadValidator.validate(audio));
			prepared.add(new PreparedMedia("audio", v.bytes(), v.contentType(), v.extension()));
			return prepared;
		}
		for (MultipartFile img : imageFiles) {
			ImageUploadValidator.ValidatedImage v = imageUploadValidator.validate(img);
			prepared.add(new PreparedMedia("image", v.bytes(), v.contentType(), v.extension()));
		}
		return prepared;
	}

	private static String previewOf(String html, boolean hasMedia) {
		String text = Jsoup.parseBodyFragment(html == null ? "" : html).text().trim();
		if (text.length() > 140) {
			return text.substring(0, 140);
		}
		if (!text.isEmpty()) {
			return text;
		}
		return hasMedia ? "Pièce jointe" : "";
	}

	private static Map<String, Object> pageMeta(int page, int size, Page<?> result) {
		return Map.of(
				"page", page,
				"perPage", size,
				"total", result.getTotalElements(),
				"totalPages", result.getTotalPages(),
				"hasNext", result.hasNext(),
				"hasPrev", result.hasPrevious());
	}

	private static UUID readUuid(JsonNode body, String field) {
		if (body == null || !body.has(field) || body.get(field).isNull()) {
			return null;
		}
		String raw = body.get(field).asString("").trim();
		if (raw.isEmpty()) {
			return null;
		}
		try {
			return UUID.fromString(raw);
		} catch (IllegalArgumentException ex) {
			throw validation(field, "Identifiant invalide.");
		}
	}

	private static String readString(JsonNode body, String field) {
		if (body == null || !body.has(field) || body.get(field).isNull()) {
			return null;
		}
		return body.get(field).asString("");
	}

	private static AppException validation(String field, String message) {
		return new AppException(
				"validation_failed",
				"La requête contient des données invalides.",
				HttpStatus.UNPROCESSABLE_ENTITY,
				Map.of("fields", Map.of(field, message)));
	}

	private record PreparedMedia(String type, byte[] bytes, String contentType, String extension) {
	}
}
