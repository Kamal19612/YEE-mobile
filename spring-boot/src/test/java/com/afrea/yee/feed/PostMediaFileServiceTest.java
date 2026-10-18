package com.afrea.yee.feed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.feed.entity.Post;
import com.afrea.yee.feed.entity.PostMedia;
import com.afrea.yee.feed.repository.PostMediaRepository;
import com.afrea.yee.groups.GroupFeedAccess;
import com.afrea.yee.groups.repository.GroupRepository;
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
class PostMediaFileServiceTest {

	@Mock
	PostMediaRepository mediaRepository;
	@Mock
	GroupRepository groupRepository;
	@Mock
	GroupFeedAccess groupFeedAccess;
	@Mock
	ObjectStorage objectStorage;

	PostMediaFileService service;

	@BeforeEach
	void setUp() {
		service = new PostMediaFileService(mediaRepository, groupRepository, groupFeedAccess, objectStorage);
	}

	@Test
	void publicPathRefusesPrivateGroupFile() {
		Post post = new Post();
		ReflectionTestUtils.setField(post, "id", 4L);
		post.setGroupId(UUID.randomUUID());
		PostMedia media = new PostMedia();
		media.setPost(post);
		media.setStorageBucket(PostMediaFileService.PUBLIC_BUCKET);
		media.setStoragePath("4/file.jpg");
		when(mediaRepository.findByPostAndPath(4L, "4/file.jpg")).thenReturn(Optional.of(media));
		when(groupRepository.findActiveById(post.getGroupId())).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.openPublic(4L, "file.jpg"))
				.isInstanceOf(AppException.class)
				.extracting(ex -> ((AppException) ex).getStatus())
				.isEqualTo(HttpStatus.NOT_FOUND);
		verify(objectStorage, never()).read(PostMediaFileService.PUBLIC_BUCKET, "4/file.jpg");
	}

	@Test
	void apiPathDoesNotExposeStorage() {
		assertThat(PostMediaLinks.apiPath(9L, 3L)).isEqualTo("/api/feed/9/media/3");
	}
}
