package com.afrea.yee.common.config;

import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Liste blanche stricte équivalente à APP_ALLOWED_ORIGINS du PHP.
 * Origines hors liste → pas d'en-têtes CORS → le navigateur bloque la lecture.
 */
@Configuration
@EnableConfigurationProperties(AppProperties.class)
public class CorsConfig {

	@Bean
	CorsConfigurationSource corsConfigurationSource(AppProperties appProperties) {
		CorsConfiguration config = new CorsConfiguration();
		List<String> origins = appProperties.getAllowedOrigins();
		if (origins.isEmpty()) {
			// Aucune origine autorisée tant que APP_ALLOWED_ORIGINS n'est pas défini.
			config.setAllowedOrigins(List.of());
		} else {
			config.setAllowedOrigins(origins);
		}
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("*"));
		config.setAllowCredentials(true);
		config.setMaxAge(3600L);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
