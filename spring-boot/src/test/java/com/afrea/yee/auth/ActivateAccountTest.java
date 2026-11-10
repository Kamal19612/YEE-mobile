package com.afrea.yee.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.dto.ResetPasswordRequest;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.auth.security.JwtService;
import com.afrea.yee.common.exception.AppException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ActivateAccountTest {

	@Mock UserRepository userRepository;
	@Mock PasswordEncoder passwordEncoder;
	@Mock JwtService jwtService;
	@Mock RefreshTokenService refreshTokenService;
	@Mock RateLimiter rateLimiter;
	@Mock AuthEmailService authEmailService;

	AuthService authService;

	@BeforeEach
	void setUp() {
		authService = new AuthService(
				userRepository,
				passwordEncoder,
				jwtService,
				refreshTokenService,
				rateLimiter,
				authEmailService);
	}

	@Test
	void activateAccountSetsPasswordActifAndEmailVerified() {
		String rawToken = "activation-raw-token-32chars-xxxxxx";
		User user = verifiedPendingUser(rawToken);
		when(userRepository.findByPasswordResetTokenHash(TokenHasher.sha256(rawToken)))
				.thenReturn(Optional.of(user));
		when(passwordEncoder.encode("correct-horse")).thenReturn("bcrypt-hash");

		authService.activateAccount(new ResetPasswordRequest(rawToken, "correct-horse"));

		assertThat(user.getPasswordHash()).isEqualTo("bcrypt-hash");
		assertThat(user.getStatus()).isEqualTo(UserAccountStatus.ACTIF);
		assertThat(user.isEmailVerified()).isTrue();
		assertThat(user.getPasswordResetTokenHash()).isNull();
		assertThat(user.getPasswordResetExpiresAt()).isNull();
		verify(refreshTokenService).revokeAllForUser(user.getId());
	}

	@Test
	void activateAccountRejectsExpiredToken() {
		String rawToken = "expired-activation-token-xxxxxx";
		User user = verifiedPendingUser(rawToken);
		user.setPasswordResetExpiresAt(Instant.now().minus(1, ChronoUnit.HOURS));
		when(userRepository.findByPasswordResetTokenHash(TokenHasher.sha256(rawToken)))
				.thenReturn(Optional.of(user));

		assertThatThrownBy(() -> authService.activateAccount(new ResetPasswordRequest(rawToken, "correct-horse")))
				.isInstanceOf(AppException.class)
				.extracting(ex -> ((AppException) ex).getCode())
				.isEqualTo("expired_token");
	}

	@Test
	void activateAccountRejectsAlreadyActiveAccount() {
		String rawToken = "already-active-token-xxxxxxxxxx";
		User user = verifiedPendingUser(rawToken);
		user.setStatus(UserAccountStatus.ACTIF);
		when(userRepository.findByPasswordResetTokenHash(TokenHasher.sha256(rawToken)))
				.thenReturn(Optional.of(user));

		assertThatThrownBy(() -> authService.activateAccount(new ResetPasswordRequest(rawToken, "correct-horse")))
				.isInstanceOf(AppException.class)
				.extracting(ex -> ((AppException) ex).getCode())
				.isEqualTo("invalid_token");
	}

	@Test
	void resetPasswordAlsoActivatesVerifiedImport() {
		String rawToken = "reset-also-activates-token-xxxx";
		User user = verifiedPendingUser(rawToken);
		when(userRepository.findByPasswordResetTokenHash(TokenHasher.sha256(rawToken)))
				.thenReturn(Optional.of(user));
		when(passwordEncoder.encode(any())).thenReturn("bcrypt-hash");

		authService.resetPassword(new ResetPasswordRequest(rawToken, "correct-horse"));

		assertThat(user.getStatus()).isEqualTo(UserAccountStatus.ACTIF);
		assertThat(user.isEmailVerified()).isTrue();
	}

	@Test
	void resetPasswordDoesNotActivateUnverifiedImport() {
		String rawToken = "reset-must-not-activate-xxxx";
		User user = verifiedPendingUser(rawToken);
		user.setStatus(UserAccountStatus.A_VERIFIER);
		when(userRepository.findByPasswordResetTokenHash(TokenHasher.sha256(rawToken)))
				.thenReturn(Optional.of(user));
		when(passwordEncoder.encode(any())).thenReturn("bcrypt-hash");

		authService.resetPassword(new ResetPasswordRequest(rawToken, "correct-horse"));

		assertThat(user.getStatus()).isEqualTo(UserAccountStatus.A_VERIFIER);
		assertThat(user.isEmailVerified()).isFalse();
		assertThat(user.getPasswordHash()).isEqualTo("bcrypt-hash");
	}

	private static User verifiedPendingUser(String rawToken) {
		User user = new User();
		ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
		user.setEmail("import@example.org");
		user.setStatus(UserAccountStatus.VERIFIE);
		user.setEmailVerified(false);
		user.setAccountDeleted(false);
		user.setAccountDeactivated(false);
		user.setPasswordResetTokenHash(TokenHasher.sha256(rawToken));
		user.setPasswordResetExpiresAt(Instant.now().plus(2, ChronoUnit.DAYS));
		return user;
	}
}
