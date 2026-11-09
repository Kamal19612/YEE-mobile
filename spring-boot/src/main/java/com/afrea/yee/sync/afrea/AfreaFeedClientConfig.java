package com.afrea.yee.sync.afrea;

import com.afrea.yee.common.config.AppProperties;
import java.net.http.HttpClient;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class AfreaFeedClientConfig {

	public static final String REST_CLIENT_BEAN = "afreaFeedRestClient";

	@Bean(name = REST_CLIENT_BEAN)
	RestClient afreaFeedRestClient(AppProperties appProperties) {
		AppProperties.Afrea afrea = appProperties.getAfrea();
		HttpClient httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofMillis(Math.max(1, afrea.getConnectTimeoutMs())))
				.build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(Duration.ofMillis(Math.max(1, afrea.getReadTimeoutMs())));

		RestClient.Builder builder = RestClient.builder().requestFactory(requestFactory);
		String base = afrea.getBaseUrl() == null ? "" : afrea.getBaseUrl().replaceAll("/+$", "");
		if (!base.isBlank()) {
			builder.baseUrl(base);
		}
		String key = afrea.getApiKey();
		if (key != null && !key.isBlank()) {
			builder.defaultHeader(afrea.getApiKeyHeader(), key);
		}
		return builder.build();
	}
}
