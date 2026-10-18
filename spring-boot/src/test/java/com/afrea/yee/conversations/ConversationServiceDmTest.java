package com.afrea.yee.conversations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.conversations.dto.ConversationResponse;
import com.afrea.yee.conversations.entity.Conversation;
import com.afrea.yee.conversations.entity.ConversationParticipant;
import com.afrea.yee.conversations.repository.ConversationMessageMediaRepository;
import com.afrea.yee.conversations.repository.ConversationMessageRepository;
import com.afrea.yee.conversations.repository.ConversationParticipantRepository;
import com.afrea.yee.conversations.repository.ConversationRepository;
import com.afrea.yee.feed.HtmlContentSanitizer;
import com.afrea.yee.groups.repository.GroupMemberRepository;
import com.afrea.yee.groups.repository.GroupRepository;
import com.afrea.yee.media.AudioSafariCompat;
import com.afrea.yee.media.AudioUploadValidator;
import com.afrea.yee.media.ImageUploadValidator;
import com.afrea.yee.media.ObjectStorage;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@ExtendWith(MockitoExtension.class)
class ConversationServiceDmTest {

	@Mock ConversationRepository conversationRepository;
	@Mock ConversationParticipantRepository participantRepository;
	@Mock ConversationMessageRepository messageRepository;
	@Mock ConversationMessageMediaRepository mediaRepository;
	@Mock UserRepository userRepository;
	@Mock GroupRepository groupRepository;
	@Mock GroupMemberRepository groupMemberRepository;
	@Mock ConversationPermissions permissions;
	@Mock UserTransformer userTransformer;
	@Mock HtmlContentSanitizer htmlContentSanitizer;
	@Mock com.afrea.yee.common.ratelimit.WriteRateLimit writeRateLimit;
	@Mock ImageUploadValidator imageUploadValidator;
	@Mock AudioUploadValidator audioUploadValidator;
	@Mock AudioSafariCompat audioSafariCompat;
	@Mock ObjectStorage objectStorage;
	@Mock ApplicationEventPublisher events;

	ConversationService service;

	@BeforeEach
	void setUp() {
		service = new ConversationService(
				conversationRepository,
				participantRepository,
				messageRepository,
				mediaRepository,
				userRepository,
				groupRepository,
				groupMemberRepository,
				permissions,
				userTransformer,
				htmlContentSanitizer,
				writeRateLimit,
				imageUploadValidator,
				audioUploadValidator,
				audioSafariCompat,
				objectStorage,
				events);
	}

	@Test
	void reusesExistingDmWithoutCreatingAnother() {
		UUID senderId = UUID.randomUUID();
		UUID recipientId = UUID.randomUUID();
		User recipient = new User();
		ReflectionTestUtils.setField(recipient, "id", recipientId);
		recipient.setDisplayName("Ada");
		recipient.setWhoCanMessage("everyone");

		Conversation existing = new Conversation();
		existing.setType("dm");
		ReflectionTestUtils.setField(existing, "id", UUID.randomUUID());
		ReflectionTestUtils.setField(existing, "updatedAt", Instant.now());

		when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));
		when(conversationRepository.findDmBetween(senderId, recipientId)).thenReturn(Optional.of(existing));
		when(participantRepository.findByConversationIdIn(any())).thenReturn(List.of(
				participant(existing, senderId),
				participant(existing, recipientId)));
		when(messageRepository.findLatestForConversations(any())).thenReturn(List.of());
		when(messageRepository.findLatest(any(), any())).thenReturn(List.of());
		when(userRepository.findAllById(any())).thenReturn(List.of(recipient));
		when(userTransformer.resolveAvatarUrl(recipient)).thenReturn(null);

		ObjectNode body = new ObjectMapper().createObjectNode();
		body.put("recipientId", recipientId.toString());

		ConversationResponse response = service.createOrGetDm(senderId, body);

		assertThat(response.id()).isEqualTo(existing.getId().toString());
		verify(conversationRepository, never()).save(any());
		verify(permissions).requireCanMessage(eq(senderId), eq(recipient));
	}

	private static ConversationParticipant participant(Conversation conversation, UUID userId) {
		ConversationParticipant p = new ConversationParticipant();
		p.setConversation(conversation);
		p.setUserId(userId);
		p.setJoinedAt(Instant.now());
		return p;
	}
}
