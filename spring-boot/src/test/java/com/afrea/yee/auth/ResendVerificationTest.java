package com.afrea.yee.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.dto.ForgotPasswordRequest;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.auth.security.JwtService;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class ResendVerificationTest {

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
		when(rateLimiter.isRateLimited(eq("resend_verification"), eq("1.2.3.4"), anyInt(), any()))
				.thenReturn(false);
	}

	@Test
	void unknownEmailDoesNotSend() {
		when(userRepository.findByEmailIgnoreCase("absent@example.org")).thenReturn(Optional.empty());

		AuthService.ResendOutcome outcome = authService.resendVerification(
				new ForgotPasswordRequest("absent@example.org"), "1.2.3.4");

		assertThat(outcome.retryAfterSeconds()).isEqualTo(AuthService.VERIFICATION_RESEND_COOLDOWN_SECONDS);
		assertThat(outcome.verificationUrl()).isNull();
		verify(authEmailService, never()).sendVerificationEmail(any(), any());
	}

	@Test
	void verifiedAccountDoesNotSend() {
		User user = pendingUser();
		user.setEmailVerified(true);
		when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));

		authService.resendVerification(new ForgotPasswordRequest(user.getEmail()), "1.2.3.4");

		verify(authEmailService, never()).sendVerificationEmail(any(), any());
	}

	@Test
	void cooldownBlocksASecondSend() {
		User user = pendingUser();
		user.setEmailVerificationSentAt(Instant.now().minus(Duration.ofSeconds(30)));
		when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));

		AuthService.ResendOutcome outcome = authService.resendVerification(
				new ForgotPasswordRequest(user.getEmail()), "1.2.3.4");

		assertThat(outcome.retryAfterSeconds()).isBetween(1, AuthService.VERIFICATION_RESEND_COOLDOWN_SECONDS - 1);
		assertThat(outcome.verificationUrl()).isNull();
		verify(authEmailService, never()).sendVerificationEmail(any(), any());
	}

	@Test
	void sendsAgainAfterTheCooldown() {
		User user = pendingUser();
		user.setEmailVerificationSentAt(Instant.now().minus(Duration.ofMinutes(3)));
		user.setEmailVerificationTokenHash("old-hash");
		when(userRepository.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(user));
		when(authEmailService.sendVerificationEmail(eq(user.getEmail()), any())).thenReturn("http://localhost/verify-email?token=new");

		AuthService.ResendOutcome outcome = authService.resendVerification(
				new ForgotPasswordRequest(user.getEmail()), "1.2.3.4");

		assertThat(outcome.retryAfterSeconds()).isEqualTo(AuthService.VERIFICATION_RESEND_COOLDOWN_SECONDS);
		assertThat(outcome.verificationUrl()).contains("verify-email");
		assertThat(user.getEmailVerificationTokenHash()).isNotEqualTo("old-hash");
		assertThat(user.getEmailVerificationSentAt()).isNotNull();
		verify(authEmailService).sendVerificationEmail(eq(user.getEmail()), any());
	}

	private static User pendingUser() {
		User user = new User();
		user.setEmail("pending@example.org");
		user.setEmailVerified(false);
		user.setAccountDeleted(false);
		user.setAccountDeactivated(false);
		return user;
	}
}
