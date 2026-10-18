package com.afrea.yee.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.RefreshTokenRepository;
import com.afrea.yee.auth.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class AuthRefreshRotationIT {

	@Container
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
			.withDatabaseName("yee")
			.withUsername("yee")
			.withPassword("yee");

	@DynamicPropertySource
	static void props(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", postgres::getJdbcUrl);
		registry.add("spring.datasource.username", postgres::getUsername);
		registry.add("spring.datasource.password", postgres::getPassword);
		registry.add("app.allowed-origins", () -> "http://localhost:5173");
		registry.add("app.jwt.secret", () -> "test-jwt-secret-key-32-bytes-min!!");
		registry.add("app.cookie.secure", () -> "false");
		registry.add("app.cookie.same-site", () -> "Lax");
	}

	@Autowired MockMvc mockMvc;
	@Autowired ObjectMapper objectMapper;
	@Autowired UserRepository userRepository;
	@Autowired RefreshTokenRepository refreshTokenRepository;
	@Autowired PasswordEncoder passwordEncoder;

	@BeforeEach
	void clean() {
		refreshTokenRepository.deleteAll();
		userRepository.deleteAll();
	}

	@Test
	void refreshRotatesToken_andReuseRevokesAllSessions() throws Exception {
		User user = new User();
		user.setEmail("alice@example.com");
		user.setDisplayName("Alice");
		user.setPasswordHash(passwordEncoder.encode("correct-horse"));
		user.setEmailVerified(true);
		userRepository.save(user);

		MvcResult login = mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"email":"alice@example.com","password":"correct-horse","rememberMe":true}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andExpect(jsonPath("$.data.accessToken").isNotEmpty())
				.andExpect(jsonPath("$.data.user.isSiteAdmin").value(false))
				.andReturn();

		Cookie firstRefresh = login.getResponse().getCookie(RefreshCookieService.COOKIE_NAME);
		assertThat(firstRefresh).isNotNull();

		MvcResult refreshed = mockMvc.perform(post("/api/auth/refresh")
						.cookie(firstRefresh)
						.header("Origin", "http://localhost:5173"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.success").value(true))
				.andReturn();

		Cookie secondRefresh = refreshed.getResponse().getCookie(RefreshCookieService.COOKIE_NAME);
		assertThat(secondRefresh).isNotNull();
		assertThat(secondRefresh.getValue()).isNotEqualTo(firstRefresh.getValue());

		// Réutilisation de l'ancien token → révocation famille / toutes sessions
		mockMvc.perform(post("/api/auth/refresh")
						.cookie(firstRefresh)
						.header("Origin", "http://localhost:5173"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.error.code").value("app_auth_refresh_reuse_detected"));

		// Le token "neuf" est aussi mort (revoke all)
		mockMvc.perform(post("/api/auth/refresh")
						.cookie(secondRefresh)
						.header("Origin", "http://localhost:5173"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void refreshRejectsDisallowedOrigin() throws Exception {
		User user = new User();
		user.setEmail("bob@example.com");
		user.setDisplayName("Bob");
		user.setPasswordHash(passwordEncoder.encode("correct-horse"));
		user.setEmailVerified(true);
		userRepository.save(user);

		MvcResult login = mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"email":"bob@example.com","password":"correct-horse"}
								"""))
				.andExpect(status().isOk())
				.andReturn();

		Cookie refresh = login.getResponse().getCookie(RefreshCookieService.COOKIE_NAME);

		mockMvc.perform(post("/api/auth/refresh")
						.cookie(refresh)
						.header("Origin", "https://evil.example"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code").value("origin_not_allowed"));
	}

	@Test
	void loginRequiresVerifiedEmail() throws Exception {
		User user = new User();
		user.setEmail("carl@example.com");
		user.setDisplayName("Carl");
		user.setPasswordHash(passwordEncoder.encode("correct-horse"));
		user.setEmailVerified(false);
		userRepository.save(user);

		mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"email":"carl@example.com","password":"correct-horse"}
								"""))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.error.code").value("email_not_verified"));
	}

	@Test
	void registerThenVerifyAllowsLogin() throws Exception {
		mockMvc.perform(post("/api/auth/register")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"email":"dana@example.com","password":"correct-horse","displayName":"Dana"}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.success").value(true));

		User user = userRepository.findByEmailIgnoreCase("dana@example.com").orElseThrow();
		assertThat(user.isEmailVerified()).isFalse();
		assertThat(user.getEmailVerificationTokenHash()).isNotBlank();

		// Le token brut n'est pas en base — on simule verify via service path en forçant un token connu
		String raw = TokenHasher.generateRawToken(32);
		user.setEmailVerificationTokenHash(TokenHasher.sha256(raw));
		userRepository.save(user);

		mockMvc.perform(post("/api/auth/verify-email")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"token\":\"" + raw + "\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.data.message").value("Email vérifié avec succès."));

		MvcResult login = mockMvc.perform(post("/api/auth/login")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"email":"dana@example.com","password":"correct-horse"}
								"""))
				.andExpect(status().isOk())
				.andReturn();

		JsonNode body = objectMapper.readTree(login.getResponse().getContentAsString());
		assertThat(body.path("data").path("user").path("displayName").asText()).isEqualTo("Dana");
	}
}
