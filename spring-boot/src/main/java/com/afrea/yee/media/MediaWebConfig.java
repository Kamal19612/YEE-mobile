package com.afrea.yee.media;

import com.afrea.yee.common.config.AppProperties;
import java.nio.file.Path;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class MediaWebConfig implements WebMvcConfigurer {

	private final AppProperties appProperties;

	public MediaWebConfig(AppProperties appProperties) {
		this.appProperties = appProperties;
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		if (!"local".equalsIgnoreCase(appProperties.getStorage().getProvider())) {
			return;
		}
		// Avatars et couvertures seulement.
		// chat-media : ChatMediaService. post-media : PostMediaFileService,
		// qui refuse le fichier si le groupe n'est plus public.
		// group-post-media n'a pas de handler.
		registerPublic(registry, "avatars");
		registerPublic(registry, "covers");
	}

	private void registerPublic(ResourceHandlerRegistry registry, String bucket) {
		String location = Path.of(appProperties.getStorage().getLocalRoot())
				.resolve(bucket)
				.toAbsolutePath()
				.normalize()
				.toUri()
				.toString();
		if (!location.endsWith("/")) {
			location = location + "/";
		}
		registry.addResourceHandler("/media/" + bucket + "/**")
				.addResourceLocations(location);
	}
}
