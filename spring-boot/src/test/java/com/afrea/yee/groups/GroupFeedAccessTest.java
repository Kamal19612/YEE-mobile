package com.afrea.yee.groups;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.feed.entity.Post;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.entity.GroupMember;
import com.afrea.yee.groups.repository.GroupRepository;
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
class GroupFeedAccessTest {

	@Mock
	GroupRepository groupRepository;

	@Mock
	GroupPermissions groupPermissions;

	GroupFeedAccess access;

	UUID groupId;
	UUID viewerId;

	@BeforeEach
	void setUp() {
		access = new GroupFeedAccess(groupRepository, groupPermissions);
		groupId = UUID.randomUUID();
		viewerId = UUID.randomUUID();
	}

	@Test
	void publicGroupFeedIsReadableWithoutSession() {
		when(groupRepository.findActiveById(groupId)).thenReturn(Optional.of(group("public")));

		access.requireGroupFeed(groupId, null);
	}

	@Test
	void privateGroupFeedIsHiddenFromStranger() {
		when(groupRepository.findActiveById(groupId)).thenReturn(Optional.of(group("private")));
		when(groupPermissions.isSiteAdmin(null)).thenReturn(false);
		when(groupPermissions.membership(groupId, null)).thenReturn(Optional.empty());

		assertHiddenGroup(() -> access.requireGroupFeed(groupId, null));
	}

	@Test
	void pendingMemberCannotReadPrivateFeed() {
		when(groupRepository.findActiveById(groupId)).thenReturn(Optional.of(group("private")));
		when(groupPermissions.isSiteAdmin(viewerId)).thenReturn(false);
		when(groupPermissions.membership(groupId, viewerId)).thenReturn(Optional.of(member("pending")));

		assertHiddenGroup(() -> access.requireGroupFeed(groupId, viewerId));
	}

	@Test
	void activeMemberCanReadSecretFeed() {
		when(groupRepository.findActiveById(groupId)).thenReturn(Optional.of(group("secret")));
		when(groupPermissions.isSiteAdmin(viewerId)).thenReturn(false);
		when(groupPermissions.membership(groupId, viewerId)).thenReturn(Optional.of(member("active")));

		access.requireGroupFeed(groupId, viewerId);
	}

	@Test
	void siteAdminCanReadSecretFeed() {
		when(groupRepository.findActiveById(groupId)).thenReturn(Optional.of(group("secret")));
		when(groupPermissions.isSiteAdmin(viewerId)).thenReturn(true);

		access.requireGroupFeed(groupId, viewerId);
	}

	@Test
	void hiddenGroupPostLooksMissing() {
		Post post = new Post();
		post.setGroupId(groupId);
		when(groupRepository.findActiveById(groupId)).thenReturn(Optional.of(group("secret")));
		when(groupPermissions.isSiteAdmin(null)).thenReturn(false);
		when(groupPermissions.membership(groupId, null)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> access.requirePostReadable(post, null))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> {
					AppException app = (AppException) ex;
					assertThat(app.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
					assertThat(app.getMessage()).isEqualTo("Publication introuvable.");
				});
	}

	@Test
	void globalPostStaysPublic() {
		Post post = new Post();
		post.setGroupId(null);

		access.requirePostReadable(post, null);
	}

	private void assertHiddenGroup(Runnable call) {
		assertThatThrownBy(call::run)
				.isInstanceOf(AppException.class)
				.satisfies(ex -> {
					AppException app = (AppException) ex;
					assertThat(app.getCode()).isEqualTo("not_found");
					assertThat(app.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
					assertThat(app.getMessage()).isEqualTo("Groupe introuvable.");
				});
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
