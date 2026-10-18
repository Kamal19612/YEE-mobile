package com.afrea.yee.common.config;

import com.afrea.yee.common.ApiPaths;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Monte tous les {@link RestController} sous {@code /api}.
 * Les handlers statiques ({@code /media/avatars}, {@code /media/covers}) restent hors préfixe.
 */
@Configuration
public class ApiPrefixConfig implements WebMvcConfigurer {

	@Override
	public void configurePathMatch(PathMatchConfigurer configurer) {
		// Uniquement nos controllers — pas BasicErrorController ni actuators Spring.
		configurer.addPathPrefix(
				ApiPaths.ROOT,
				c -> c.isAnnotationPresent(RestController.class)
						&& c.getPackageName().startsWith("com.afrea.yee"));
	}
}
