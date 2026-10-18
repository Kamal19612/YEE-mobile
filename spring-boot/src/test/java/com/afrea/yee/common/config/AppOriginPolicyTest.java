package com.afrea.yee.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AppOriginPolicyTest {

	@Test
	void refreshOriginMustBeListed() {
		AppProperties properties = new AppProperties();
		properties.setAllowedOrigins("https://events.socialracine.com,http://localhost:5173");

		assertThat(properties.isOriginAllowed(null)).isFalse();
		assertThat(properties.isOriginAllowed("")).isFalse();
		assertThat(properties.isOriginAllowed("https://evil.example")).isFalse();
		assertThat(properties.isOriginAllowed("https://events.socialracine.com")).isTrue();
		assertThat(properties.isOriginAllowed("http://localhost:5173")).isTrue();
	}
}
