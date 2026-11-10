package com.afrea.yee.sync;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;

import com.afrea.yee.auth.UserAccountStatus;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import com.afrea.yee.sync.entity.SyncLog;
import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class AfreaSyncServiceIT {

	@Container
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
			.withDatabaseName("yee")
			.withUsername("yee")
			.withPassword("yee");

	static final WireMockServer wireMock = new WireMockServer(wireMockConfig().dynamicPort());

	static {
		wireMock.start();
	}

	@AfterAll
	static void stopWireMock() {
		wireMock.stop();
	}

	@DynamicPropertySource
	static void props(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", postgres::getJdbcUrl);
		registry.add("spring.datasource.username", postgres::getUsername);
		registry.add("spring.datasource.password", postgres::getPassword);
		registry.add("app.allowed-origins", () -> "http://localhost:5173");
		registry.add("app.jwt.secret", () -> "test-jwt-secret-key-32-bytes-min!!");
		registry.add("app.afrea.base-url", () -> wireMock.baseUrl() + "/aed-feed");
		registry.add("app.afrea.api-key", () -> "test-key-not-a-secret");
		registry.add("app.afrea.api-key-header", () -> "X-AFREA-KEY");
	}

	@Autowired AfreaSyncService afreaSyncService;
	@Autowired UserRepository userRepository;
	@Autowired InstitutionRepository institutionRepository;

	@BeforeEach
	void reset() {
		wireMock.resetAll();
		stubFeed();
	}

	@Test
	void twoSyncRunsDoNotCreateDuplicates() {
		SyncRunResult first = afreaSyncService.run(true);
		assertThat(first.status()).isIn(SyncLog.SUCCESS, SyncLog.PARTIAL);
		assertThat(userRepository.findByExternalId("2231")).isPresent();
		assertThat(userRepository.findByExternalId("3986")).isPresent();
		assertThat(institutionRepository.findByExternalId("afrea-africa")).isPresent();

		long usersAfterFirst = userRepository.findByExternalIdIsNotNull().size();
		long institutionsAfterFirst = institutionRepository.findAll().stream()
				.filter(i -> i.getExternalId() != null)
				.count();

		SyncRunResult second = afreaSyncService.run(true);
		assertThat(second.status()).isIn(SyncLog.SUCCESS, SyncLog.PARTIAL);
		assertThat(userRepository.findByExternalIdIsNotNull()).hasSize((int) usersAfterFirst);
		assertThat(institutionRepository.findAll().stream().filter(i -> i.getExternalId() != null).count())
				.isEqualTo(institutionsAfterFirst);

		User u = userRepository.findByExternalId("2231").orElseThrow();
		assertThat(u.getStatus()).isEqualTo(UserAccountStatus.A_VERIFIER);
		assertThat(u.getPasswordHash()).isNull();
		assertThat(second.created()).isZero();
	}

	private static void stubFeed() {
		String page = """
				{
				  "generatedAt": "2026-11-09T16:00:00Z",
				  "has_more": false,
				  "next_after": null,
				  "users": [
				    {
				      "externalId": "2231",
				      "email": "one@example.org",
				      "displayName": "One",
				      "bio": null,
				      "profession": null,
				      "location": "Ghana",
				      "organization": null,
				      "socialLinks": {"linkedin": null, "twitter": null, "website": null},
				      "avatarUrl": null,
				      "coverUrl": null,
				      "languages": "English",
				      "membership": {"type": "individual", "expiresOn": "2027-11-01", "yee": false},
				      "updatedAt": "2026-10-27T14:05:00Z"
				    },
				    {
				      "externalId": "3986",
				      "email": "two@example.org",
				      "displayName": "Two",
				      "bio": null,
				      "profession": null,
				      "location": "Kenya",
				      "organization": null,
				      "socialLinks": {"linkedin": null, "twitter": null, "website": null},
				      "avatarUrl": null,
				      "coverUrl": null,
				      "languages": "English, French",
				      "membership": {"type": "vope_member", "expiresOn": "2027-01-01", "yee": true},
				      "updatedAt": "2026-10-28T10:00:00Z"
				    }
				  ],
				  "institutions": [
				    {
				      "externalId": "afrea-africa",
				      "name": "AfrEA",
				      "type": "continent",
				      "parentExternalId": null,
				      "description": "Umbrella"
				    },
				    {
				      "externalId": "vope-1",
				      "name": "Example VOPE",
				      "type": "country",
				      "parentExternalId": "afrea-africa",
				      "description": "VOPE"
				    }
				  ],
				  "affiliations": [
				    {
				      "userExternalId": "3986",
				      "institutionExternalId": "vope-1",
				      "status": "active"
				    }
				  ],
				  "referents": []
				}
				""";
		wireMock.stubFor(get(urlPathEqualTo("/aed-feed"))
				.withQueryParam("ids", com.github.tomakehurst.wiremock.client.WireMock.equalTo("1"))
				.atPriority(1)
				.willReturn(aResponse()
						.withHeader("Content-Type", "application/json")
						.withBody("""
								{"generatedAt":"2026-11-09T16:00:00Z","ids":["2231","3986"],"count":2,"scope":"test"}
								""")));
		wireMock.stubFor(get(urlPathEqualTo("/aed-feed"))
				.atPriority(10)
				.willReturn(aResponse()
						.withHeader("Content-Type", "application/json")
						.withBody(page)));
	}
}
