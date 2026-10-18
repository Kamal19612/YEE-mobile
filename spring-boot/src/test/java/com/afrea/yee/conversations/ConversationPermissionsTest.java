package com.afrea.yee.conversations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.conversations.repository.ConversationParticipantRepository;
import com.afrea.yee.groups.GroupPermissions;
import com.afrea.yee.groups.repository.GroupRepository;
import com.afrea.yee.users.FollowService;
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
class ConversationPermissionsTest {

	@Mock UserRepository userRepository;
	@Mock FollowService followService;
	@Mock GroupPermissions groupPermissions;
	@Mock GroupRepository groupRepository;
	@Mock ConversationParticipantRepository participantRepository;

	ConversationPermissions permissions;

	@BeforeEach
	void setUp() {
		permissions = new ConversationPermissions(
				userRepository, followService, groupPermissions, groupRepository, participantRepository);
	}

	@Test
	void nobodyBlocksEveryoneExceptAdmin() {
		UUID sender = UUID.randomUUID();
		User recipient = recipient("nobody");
		when(userRepository.findById(sender)).thenReturn(Optional.of(plainUser(false)));
		assertThat(permissions.canMessage(sender, recipient)).isFalse();
	}

	@Test
	void friendsRequiresMutualFollow() {
		UUID sender = UUID.randomUUID();
		User recipient = recipient("friends");
		when(userRepository.findById(sender)).thenReturn(Optional.of(plainUser(false)));
		when(followService.isFollowing(sender, recipient.getId())).thenReturn(true);
		when(followService.isFollowing(recipient.getId(), sender)).thenReturn(false);
		assertThat(permissions.canMessage(sender, recipient)).isFalse();

		when(followService.isFollowing(recipient.getId(), sender)).thenReturn(true);
		assertThat(permissions.canMessage(sender, recipient)).isTrue();
	}

	@Test
	void everyoneAllowsAnyActiveMember() {
		UUID sender = UUID.randomUUID();
		User recipient = recipient("everyone");
		when(userRepository.findById(sender)).thenReturn(Optional.of(plainUser(false)));
		assertThat(permissions.canMessage(sender, recipient)).isTrue();
	}

	@Test
	void requireCanMessageThrowsForbidden() {
		UUID sender = UUID.randomUUID();
		User recipient = recipient("nobody");
		when(userRepository.findById(sender)).thenReturn(Optional.of(plainUser(false)));
		assertThatThrownBy(() -> permissions.requireCanMessage(sender, recipient))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
	}

	@Test
	void normalizeWhoCanMessageDefaultsToFriends() {
		assertThat(permissions.normalizeWhoCanMessage(null)).isEqualTo("friends");
		assertThat(permissions.normalizeWhoCanMessage("EVERYONE")).isEqualTo("everyone");
		assertThat(permissions.normalizeWhoCanMessage("nope")).isEqualTo("friends");
	}

	private static User recipient(String policy) {
		User user = plainUser(false);
		user.setWhoCanMessage(policy);
		return user;
	}

	private static User plainUser(boolean admin) {
		User user = new User();
		ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
		user.setSiteAdmin(admin);
		user.setAccountDeleted(false);
		user.setAccountDeactivated(false);
		user.setWhoCanMessage("friends");
		return user;
	}
}
