package com.afrea.yee.conversations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.conversations.entity.Conversation;
import com.afrea.yee.conversations.entity.ConversationMessage;
import com.afrea.yee.conversations.entity.ConversationMessageMedia;
import com.afrea.yee.conversations.repository.ConversationMessageMediaRepository;
import com.afrea.yee.media.ObjectStorage;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ChatMediaServiceTest {

	@Mock
	ConversationMessageMediaRepository mediaRepository;
	@Mock
	ConversationPermissions permissions;
	@Mock
	ObjectStorage objectStorage;

	ChatMediaService service;

	@BeforeEach
	void setUp() {
		service = new ChatMediaService(mediaRepository, permissions, objectStorage);
	}

	@Test
	void refusesMediaFromAnotherConversation() {
		UUID asked = UUID.randomUUID();
		UUID owner = UUID.randomUUID();
		when(mediaRepository.findWithConversation(7L)).thenReturn(Optional.of(media(owner)));

		assertThatThrownBy(() -> service.open(UUID.randomUUID(), asked, 7L))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
		verify(objectStorage, never()).read(ChatMediaService.BUCKET, "conv/file.png");
	}

	@Test
	void apiPathDoesNotExposeStorage() {
		UUID id = UUID.fromString("11111111-1111-1111-1111-111111111111");
		assertThat(ChatMediaLinks.apiPath(id, 4L))
				.isEqualTo("/conversations/11111111-1111-1111-1111-111111111111/media/4");
	}

	private static ConversationMessageMedia media(UUID conversationId) {
		Conversation conversation = new Conversation();
		ReflectionTestUtils.setField(conversation, "id", conversationId);
		ConversationMessage message = new ConversationMessage();
		message.setConversation(conversation);
		ConversationMessageMedia media = new ConversationMessageMedia();
		media.setMessage(message);
		media.setStoragePath("conv/file.png");
		media.setMediaType("image");
		return media;
	}
}
