package com.afrea.yee.sync.afrea;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.afrea.yee.common.config.AppProperties;
import com.afrea.yee.sync.afrea.dto.AfreaIdsResponseDto;
import com.github.tomakehurst.wiremock.WireMockServer;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

class AfreaFeedClientWireMockTest {

	private WireMockServer wireMock;
	private AfreaFeedClient client;

	@BeforeEach
	void setUp() {
		wireMock = new WireMockServer(wireMockConfig().dynamicPort());
		wireMock.start();

		AppProperties props = new AppProperties();
		props.getAfrea().setBaseUrl(wireMock.baseUrl() + "/aed-feed");
		props.getAfrea().setApiKey("test-key-not-a-secret");
		props.getAfrea().setApiKeyHeader("X-AFREA-KEY");
		props.getAfrea().setMaxRetries(2);
		props.getAfrea().setRetryBackoffMs(10);
		props.getAfrea().setConnectTimeoutMs(5_000);
		props.getAfrea().setReadTimeoutMs(5_000);

		HttpClient httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofMillis(5_000))
				.build();
		JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
		factory.setReadTimeout(Duration.ofMillis(5_000));

		RestClient restClient = RestClient.builder()
				.baseUrl(props.getAfrea().getBaseUrl())
				.defaultHeader("X-AFREA-KEY", "test-key-not-a-secret")
				.requestFactory(factory)
				.build();

		client = new AfreaFeedClient(restClient, props);
	}

	@AfterEach
	void tearDown() {
		if (wireMock != null) {
			wireMock.stop();
		}
	}

	@Test
	void fetchAllPaginatesAndMergesPeople() {
		wireMock.stubFor(get(urlPathEqualTo("/aed-feed"))
				.withHeader("X-AFREA-KEY", equalTo("test-key-not-a-secret"))
				.willReturn(aResponse()
						.withHeader("Content-Type", "application/json")
						.withBody("""
								{
								  "generatedAt": "2026-11-01T06:00:00Z",
								  "has_more": true,
								  "next_after": "cursor-2",
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
								    }
								  ],
								  "institutions": [
								    {
								      "externalId": "afrea-africa",
								      "name": "AfrEA",
								      "type": "continent",
								      "parentExternalId": null,
								      "description": "Umbrella"
								    }
								  ],
								  "affiliations": [],
								  "referents": []
								}
								""")));

		wireMock.stubFor(get(urlPathEqualTo("/aed-feed"))
				.withQueryParam("after", equalTo("cursor-2"))
				.willReturn(aResponse()
						.withHeader("Content-Type", "application/json")
						.withBody("""
								{
								  "generatedAt": "2026-11-01T06:00:00Z",
								  "has_more": false,
								  "next_after": null,
								  "users": [
								    {
								      "externalId": "3986",
								      "email": "two@example.org",
								      "displayName": "Two",
								      "updatedAt": "2026-10-28T10:00:00Z"
								    }
								  ],
								  "institutions": [],
								  "affiliations": [],
								  "referents": []
								}
								""")));

		AfreaFeedSnapshot snapshot = client.fetchAll(null);

		assertThat(snapshot.people()).extracting(p -> p.externalId()).containsExactly("2231", "3986");
		assertThat(snapshot.institutions()).extracting(i -> i.externalId()).containsExactly("afrea-africa");
		assertThat(snapshot.generatedAt()).isEqualTo(Instant.parse("2026-11-01T06:00:00Z"));

		wireMock.verify(getRequestedFor(urlPathEqualTo("/aed-feed"))
				.withHeader("X-AFREA-KEY", equalTo("test-key-not-a-secret")));
	}

	@Test
	void fetchPagePassesUpdatedSince() {
		wireMock.stubFor(get(urlPathEqualTo("/aed-feed"))
				.withQueryParam("updated_since", equalTo("2026-11-01T06:00:00Z"))
				.willReturn(aResponse()
						.withHeader("Content-Type", "application/json")
						.withBody("""
								{
								  "generatedAt": "2026-11-02T06:00:00Z",
								  "has_more": false,
								  "users": [],
								  "institutions": [],
								  "affiliations": [],
								  "referents": []
								}
								""")));

		var page = client.fetchPage(null, Instant.parse("2026-11-01T06:00:00Z"));
		assertThat(page.more()).isFalse();
		assertThat(page.peopleOrEmpty()).isEmpty();
	}

	@Test
	void fetchActiveIds() {
		wireMock.stubFor(get(urlPathEqualTo("/aed-feed"))
				.withQueryParam("ids", equalTo("1"))
				.willReturn(aResponse()
						.withHeader("Content-Type", "application/json")
						.withBody("""
								{"generatedAt":"2026-11-01T06:00:00Z","ids":["2231","3986"]}
								""")));

		AfreaIdsResponseDto ids = client.fetchActiveIds();
		assertThat(ids.idsOrEmpty()).containsExactly("2231", "3986");
	}

	@Test
	void retriesOn503ThenSucceeds() {
		wireMock.stubFor(get(urlPathEqualTo("/aed-feed"))
				.inScenario("retry")
				.whenScenarioStateIs("Started")
				.willReturn(aResponse().withStatus(503))
				.willSetStateTo("ok"));

		wireMock.stubFor(get(urlPathEqualTo("/aed-feed"))
				.inScenario("retry")
				.whenScenarioStateIs("ok")
				.willReturn(aResponse()
						.withHeader("Content-Type", "application/json")
						.withBody("""
								{"generatedAt":"2026-11-01T06:00:00Z","has_more":false,"users":[],"institutions":[],"affiliations":[],"referents":[]}
								""")));

		var page = client.fetchPage(null, null);
		assertThat(page.generatedAt()).isEqualTo(Instant.parse("2026-11-01T06:00:00Z"));
	}

	@Test
	void failsAfterRetriesOnPersistent503() {
		wireMock.stubFor(get(urlPathEqualTo("/aed-feed"))
				.willReturn(aResponse().withStatus(503)));

		assertThatThrownBy(() -> client.fetchPage(null, null))
				.isInstanceOf(AfreaFeedException.class)
				.hasMessageContaining("503");
	}
}
