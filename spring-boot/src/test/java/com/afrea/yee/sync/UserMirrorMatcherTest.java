package com.afrea.yee.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserMirrorMatcherTest {

	@Mock
	UserRepository userRepository;

	UserMirrorMatcher matcher;

	@BeforeEach
	void setUp() {
		matcher = new UserMirrorMatcher(userRepository);
	}

	@Test
	void prefersExternalIdOverEmail() {
		User byExternal = new User();
		byExternal.setExternalId("2231");
		byExternal.setEmail("other@example.org");

		when(userRepository.findByExternalId("2231")).thenReturn(Optional.of(byExternal));

		Optional<User> found = matcher.findExisting("2231", "e***@afrea.org");
		assertThat(found).contains(byExternal);
	}

	@Test
	void fallsBackToEmailWhenNoExternalIdYet() {
		User local = new User();
		local.setEmail("person@afrea.org");
		local.setExternalId(null);

		when(userRepository.findByExternalId("3986")).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("person@afrea.org")).thenReturn(Optional.of(local));

		Optional<User> found = matcher.findExisting("3986", "Person@Afrea.org");
		assertThat(found).contains(local);
	}

	@Test
	void refusesEmailMergeWhenAlreadyLinkedToAnotherExternalId() {
		User linked = new User();
		linked.setEmail("person@afrea.org");
		linked.setExternalId("1111");

		when(userRepository.findByExternalId("3986")).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("person@afrea.org")).thenReturn(Optional.of(linked));

		assertThat(matcher.findExisting("3986", "person@afrea.org")).isEmpty();
	}

	@Test
	void returnsEmptyWhenNeitherMatches() {
		when(userRepository.findByExternalId("9999")).thenReturn(Optional.empty());
		when(userRepository.findByEmailIgnoreCase("nobody@example.org")).thenReturn(Optional.empty());

		assertThat(matcher.findExisting("9999", "nobody@example.org")).isEmpty();
	}
}
