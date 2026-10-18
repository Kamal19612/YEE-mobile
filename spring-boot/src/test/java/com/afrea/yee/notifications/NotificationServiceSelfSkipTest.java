package com.afrea.yee.notifications;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.conversations.repository.ConversationRepository;
import com.afrea.yee.groups.repository.GroupRepository;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.notifications.repository.NotificationRepository;
import com.afrea.yee.users.UserTransformer;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceSelfSkipTest {

	@Mock NotificationRepository notificationRepository;
	@Mock UserRepository userRepository;
	@Mock GroupRepository groupRepository;
	@Mock InstitutionRepository institutionRepository;
	@Mock ConversationRepository conversationRepository;
	@Mock UserTransformer userTransformer;
	@Mock NotificationRealtimeHub realtimeHub;
	@Mock WebPushService webPushService;

	@InjectMocks NotificationService notificationService;

	@Test
	void skipsSelfNotification() {
		UUID same = UUID.randomUUID();
		notificationService.safeNotify(same, "new_follower", same, null, null);
		verify(notificationRepository, never()).save(any());
	}

	@Test
	void persistsWhenRecipientDiffers() {
		UUID recipient = UUID.randomUUID();
		UUID actor = UUID.randomUUID();
		when(notificationRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		when(notificationRepository.countByUserIdAndReadFalse(recipient)).thenReturn(1L);

		notificationService.safeNotify(recipient, "post_like", actor, "post", "42");

		ArgumentCaptor<com.afrea.yee.notifications.entity.Notification> cap =
				ArgumentCaptor.forClass(com.afrea.yee.notifications.entity.Notification.class);
		verify(notificationRepository).saveAndFlush(cap.capture());
		assertThat(cap.getValue().getType()).isEqualTo("post_like");
		assertThat(cap.getValue().getUserId()).isEqualTo(recipient);
		assertThat(cap.getValue().getSubjectType()).isEqualTo("post");
		assertThat(cap.getValue().getSubjectId()).isEqualTo("42");
	}
}
