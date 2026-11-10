package com.afrea.yee.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.AuthEmailService;
import com.afrea.yee.auth.RefreshTokenService;
import com.afrea.yee.auth.UserAccountStatus;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.RefreshTokenRepository;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.feed.repository.PostCommentRepository;
import com.afrea.yee.feed.repository.PostLikeRepository;
import com.afrea.yee.feed.repository.PostRepository;
import com.afrea.yee.groups.repository.GroupMemberRepository;
import com.afrea.yee.institutions.repository.UserInstitutionRepository;
import com.afrea.yee.users.AccountDeletionService;
import com.afrea.yee.users.UserTransformer;
import com.afrea.yee.users.repository.FollowRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AdminAccountVerifyTest {

	@Mock UserRepository userRepository;
	@Mock RefreshTokenRepository refreshTokenRepository;
	@Mock RefreshTokenService refreshTokenService;
	@Mock UserTransformer userTransformer;
	@Mock PostRepository postRepository;
	@Mock PostLikeRepository postLikeRepository;
	@Mock PostCommentRepository postCommentRepository;
	@Mock FollowRepository followRepository;
	@Mock GroupMemberRepository groupMemberRepository;
	@Mock UserInstitutionRepository userInstitutionRepository;
	@Mock AccountDeletionService accountDeletionService;
	@Mock AuthEmailService authEmailService;
	@Mock ObjectMapper objectMapper;

	AdminAccountService service;

	@BeforeEach
	void setUp() {
		service = new AdminAccountService(
				userRepository,
				refreshTokenRepository,
				refreshTokenService,
				userTransformer,
				postRepository,
				postLikeRepository,
				postCommentRepository,
				followRepository,
				groupMemberRepository,
				userInstitutionRepository,
				accountDeletionService,
				authEmailService,
				objectMapper);
	}

	@Test
	void verifyMovesAVerifierToVerifieAndSendsActivationMail() {
		UUID id = UUID.randomUUID();
		User user = new User();
		ReflectionTestUtils.setField(user, "id", id);
		user.setEmail("mirror@example.org");
		user.setStatus(UserAccountStatus.A_VERIFIER);
		user.setAccountDeleted(false);
		user.setAccountDeactivated(false);

		when(userRepository.findById(id)).thenReturn(Optional.of(user));
		when(authEmailService.sendAccountActivationEmail(eq("mirror@example.org"), any()))
				.thenReturn("http://localhost:5173/activate-account?token=raw");
		when(authEmailService.shouldExposeLinks()).thenReturn(true);

		Map<String, Object> result = service.verify(id);

		assertThat(result.get("verified")).isEqualTo(1);
		assertThat(result.get("skipped")).isEqualTo(0);
		assertThat(user.getStatus()).isEqualTo(UserAccountStatus.VERIFIE);
		assertThat(user.getPasswordResetTokenHash()).isNotBlank();
		assertThat(user.getPasswordResetExpiresAt()).isNotNull();
		verify(authEmailService).sendAccountActivationEmail(eq("mirror@example.org"), any());
		assertThat(result.get("activationLinks")).isInstanceOf(List.class);
	}

	@Test
	void verifySkipsActiveAccounts() {
		UUID id = UUID.randomUUID();
		User user = new User();
		ReflectionTestUtils.setField(user, "id", id);
		user.setEmail("active@example.org");
		user.setStatus(UserAccountStatus.ACTIF);
		user.setAccountDeleted(false);
		user.setAccountDeactivated(false);
		when(userRepository.findById(id)).thenReturn(Optional.of(user));

		Map<String, Object> result = service.verify(id);

		assertThat(result.get("verified")).isEqualTo(0);
		assertThat(result.get("skipped")).isEqualTo(1);
		assertThat(user.getStatus()).isEqualTo(UserAccountStatus.ACTIF);
	}
}
