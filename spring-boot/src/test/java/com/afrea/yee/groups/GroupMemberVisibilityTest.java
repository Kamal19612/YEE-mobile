package com.afrea.yee.groups;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.entity.GroupMember;
import com.afrea.yee.groups.repository.GroupMemberRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class GroupMemberVisibilityTest {

	@Mock
	GroupMemberRepository groupMemberRepository;
	@Mock
	UserRepository userRepository;

	GroupPermissions permissions;
	UUID groupId;
	UUID viewerId;

	@BeforeEach
	void setUp() {
		permissions = new GroupPermissions(groupMemberRepository, userRepository);
		groupId = UUID.randomUUID();
		viewerId = UUID.randomUUID();
	}

	@Test
	void bannedMemberCannotViewSecretGroup() {
		when(userRepository.findById(viewerId)).thenReturn(Optional.empty());
		when(groupMemberRepository.findByGroupIdAndUserId(groupId, viewerId))
				.thenReturn(Optional.of(member("banned")));

		assertThat(permissions.canView(group("secret"), viewerId)).isFalse();
	}

	@Test
	void invitedMemberCanViewSecretGroupButNotItsRoster() {
		when(userRepository.findById(viewerId)).thenReturn(Optional.empty());
		when(groupMemberRepository.findByGroupIdAndUserId(groupId, viewerId))
				.thenReturn(Optional.of(member("invited")));

		assertThat(permissions.canView(group("secret"), viewerId)).isTrue();
		assertThat(permissions.canListMembers(group("secret"), viewerId)).isFalse();
	}

	@Test
	void strangerSeesPrivateGroupButNotMembers() {
		when(userRepository.findById(viewerId)).thenReturn(Optional.empty());
		when(groupMemberRepository.findByGroupIdAndUserId(groupId, viewerId)).thenReturn(Optional.empty());

		assertThat(permissions.canView(group("private"), viewerId)).isTrue();
		assertThat(permissions.canListMembers(group("private"), viewerId)).isFalse();
	}

	@Test
	void activeMemberListsPrivateRoster() {
		when(userRepository.findById(viewerId)).thenReturn(Optional.empty());
		when(groupMemberRepository.findByGroupIdAndUserId(groupId, viewerId))
				.thenReturn(Optional.of(member("active")));

		assertThat(permissions.canListMembers(group("private"), viewerId)).isTrue();
	}

	private GroupEntity group(String visibility) {
		GroupEntity group = new GroupEntity();
		ReflectionTestUtils.setField(group, "id", groupId);
		group.setVisibility(visibility);
		return group;
	}

	private static GroupMember member(String status) {
		GroupMember member = new GroupMember();
		member.setStatus(status);
		return member;
	}
}
