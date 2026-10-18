package com.afrea.yee.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.entity.RefreshToken;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.RefreshTokenRepository;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class RefreshTokenRotationTest {

	@Mock RefreshTokenRepository refreshTokenRepository;
	@Mock UserRepository userRepository;

	@InjectMocks RefreshTokenService refreshTokenService;

	private User user;
	private UUID familyId;

	@BeforeEach
	void setUp() {
		user = new User();
		user.setEmail("a@b.c");
		user.setPasswordHash("x");
		user.setDisplayName("A");
		// id via reflection-less: set through save path — use UUID by saving on entity if setter exists
		familyId = UUID.randomUUID();
	}

	@Test
	void rotateConsumesTokenAndReturnsFamily() throws Exception {
		setUserId(user, UUID.randomUUID());
		String raw = "raw-refresh-token-value";
		String hash = TokenHasher.sha256(raw);

		RefreshToken row = new RefreshToken();
		row.setUser(user);
		row.setTokenHash(hash);
		row.setFamilyId(familyId);
		row.setRememberMe(true);
		row.setExpiresAt(Instant.now().plus(10, ChronoUnit.DAYS));

		when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(row));
		when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		RefreshTokenService.RotationResult result = refreshTokenService.rotate(raw);

		assertThat(result.userId()).isEqualTo(user.getId());
		assertThat(result.familyId()).isEqualTo(familyId);
		assertThat(result.rememberMe()).isTrue();
		assertThat(row.getUsedAt()).isNotNull();
		verify(refreshTokenRepository).save(row);
		verify(refreshTokenRepository, never()).revokeAllActiveForUser(any());
	}

	@Test
	void reuseOfConsumedTokenRevokesAllSessions() throws Exception {
		setUserId(user, UUID.randomUUID());
		String raw = "already-used";
		String hash = TokenHasher.sha256(raw);

		RefreshToken row = new RefreshToken();
		row.setUser(user);
		row.setTokenHash(hash);
		row.setFamilyId(familyId);
		row.setExpiresAt(Instant.now().plus(10, ChronoUnit.DAYS));
		row.setUsedAt(Instant.now().minusSeconds(60));

		when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(row));

		assertThatThrownBy(() -> refreshTokenService.rotate(raw))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> {
					AppException app = (AppException) ex;
					assertThat(app.getCode()).isEqualTo("app_auth_refresh_reuse_detected");
					assertThat(app.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
				});

		verify(refreshTokenRepository).revokeAllActiveForUser(user.getId());
	}

	@Test
	void expiredTokenRejected() throws Exception {
		setUserId(user, UUID.randomUUID());
		String raw = "expired";
		String hash = TokenHasher.sha256(raw);

		RefreshToken row = new RefreshToken();
		row.setUser(user);
		row.setTokenHash(hash);
		row.setFamilyId(familyId);
		row.setExpiresAt(Instant.now().minus(1, ChronoUnit.HOURS));

		when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(row));

		assertThatThrownBy(() -> refreshTokenService.rotate(raw))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> assertThat(((AppException) ex).getCode()).isEqualTo("app_auth_refresh_expired"));
	}

	private static void setUserId(User user, UUID id) throws Exception {
		var field = User.class.getDeclaredField("id");
		field.setAccessible(true);
		field.set(user, id);
	}
}
