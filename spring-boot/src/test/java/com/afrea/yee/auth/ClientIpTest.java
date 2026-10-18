package com.afrea.yee.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpTest {

	private final RateLimiter limiter = new RateLimiter();

	@Test
	void ignoresForwardedHeadersOnDirectConnection() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setRemoteAddr("203.0.113.9");
		request.addHeader("X-Forwarded-For", "1.2.3.4");
		request.addHeader("CF-Connecting-IP", "9.9.9.9");

		assertThat(limiter.clientIp(request)).isEqualTo("203.0.113.9");
	}

	@Test
	void usesAddressAddedByTrustedProxy() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setRemoteAddr("127.0.0.1");
		request.addHeader("X-Forwarded-For", "1.2.3.4, 198.51.100.8");
		request.addHeader("CF-Connecting-IP", "9.9.9.9");

		assertThat(limiter.clientIp(request)).isEqualTo("198.51.100.8");
	}

	@Test
	void treatsIpv6LoopbackAsTrustedProxy() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setRemoteAddr("0:0:0:0:0:0:0:1");
		request.addHeader("X-Forwarded-For", "198.51.100.8");

		assertThat(limiter.clientIp(request)).isEqualTo("198.51.100.8");
	}
}
