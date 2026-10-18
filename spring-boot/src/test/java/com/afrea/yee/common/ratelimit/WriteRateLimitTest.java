package com.afrea.yee.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.RateLimiter;
import com.afrea.yee.common.exception.AppException;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class WriteRateLimitTest {

	@Mock RateLimiter rateLimiter;
	@InjectMocks WriteRateLimit writeRateLimit;

	@Test
	void throwsTooManyRequestsWhenLimited() {
		UUID userId = UUID.randomUUID();
		when(rateLimiter.isRateLimited(eq("create_post"), eq(userId.toString()), anyInt(), any(Duration.class)))
				.thenReturn(true);

		assertThatThrownBy(() -> writeRateLimit.checkCreatePost(userId))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> {
					AppException app = (AppException) ex;
					assertThat(app.getCode()).isEqualTo("rate_limited");
					assertThat(app.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
				});
	}
}
