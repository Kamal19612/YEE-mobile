package com.afrea.yee.media;

import com.afrea.yee.common.config.AppProperties;
import com.afrea.yee.common.exception.AppException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/**
 * Client REST Supabase Storage (pas le SDK Java officiel — plus simple à
 * contrôler pour upload service-role + URL publique).
 */
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "supabase")
public class SupabaseObjectStorage implements ObjectStorage {

	private final AppProperties appProperties;
	private final RestClient restClient;

	public SupabaseObjectStorage(AppProperties appProperties) {
		this.appProperties = appProperties;
		String base = appProperties.getStorage().getSupabaseUrl();
		String key = appProperties.getStorage().getSupabaseServiceRoleKey();
		if (base == null || base.isBlank() || key == null || key.isBlank()) {
			throw new IllegalStateException("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for supabase storage");
		}
		this.restClient = RestClient.builder()
				.baseUrl(base.replaceAll("/+$", ""))
				.defaultHeader("Authorization", "Bearer " + key)
				.defaultHeader("apikey", key)
				.build();
	}

	@Override
	public StoredObject upload(String bucket, String objectPath, byte[] content, String contentType) {
		try {
			restClient.post()
					.uri("/storage/v1/object/{bucket}/{path}", bucket, objectPath)
					.contentType(MediaType.parseMediaType(contentType))
					.header("x-upsert", "true")
					.body(content)
					.retrieve()
					.toBodilessEntity();
		} catch (RuntimeException ex) {
			throw new AppException("upload_failed", "Échec de l’upload.", HttpStatus.INTERNAL_SERVER_ERROR);
		}
		// URL publique : avatars, couvertures et médias de posts seulement.
		// Les pièces de chat passent par ChatMediaService, qui appelle read().
		String publicUrl = appProperties.getStorage().getSupabaseUrl().replaceAll("/+$", "")
				+ "/storage/v1/object/public/" + bucket + "/" + objectPath;
		return new StoredObject(bucket, objectPath, publicUrl);
	}

	@Override
	public byte[] read(String bucket, String objectPath) {
		if (!safeSegment(bucket) || !safeObjectPath(objectPath)) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
		try {
			byte[] body = restClient.get()
					.uri("/storage/v1/object/{bucket}/{path}", bucket, objectPath)
					.retrieve()
					.body(byte[].class);
			if (body == null || body.length == 0) {
				throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
			}
			return body;
		} catch (AppException ex) {
			throw ex;
		} catch (RuntimeException ex) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
	}

	@Override
	public Resource openResource(String bucket, String objectPath) {
		byte[] body = read(bucket, objectPath);
		return new ByteArrayResource(body) {
			@Override
			public String getFilename() {
				return objectPath;
			}
		};
	}

	@Override
	public long size(String bucket, String objectPath) {
		if (!safeSegment(bucket) || !safeObjectPath(objectPath)) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
		try {
			var headers = restClient.head()
					.uri("/storage/v1/object/{bucket}/{path}", bucket, objectPath)
					.retrieve()
					.toBodilessEntity()
					.getHeaders();
			long len = headers.getContentLength();
			if (len >= 0) {
				return len;
			}
		} catch (RuntimeException ignored) {
			// fallback below
		}
		return read(bucket, objectPath).length;
	}

	@Override
	public void delete(String bucket, String objectPath) {
		try {
			restClient.delete()
					.uri("/storage/v1/object/{bucket}/{path}", bucket, objectPath)
					.retrieve()
					.toBodilessEntity();
		} catch (RuntimeException ignored) {
			// best-effort
		}
	}

	private static boolean safeSegment(String value) {
		return value != null && !value.isBlank() && !value.contains("..") && !value.contains("/") && !value.contains("\\");
	}

	private static boolean safeObjectPath(String value) {
		return value != null && !value.isBlank() && !value.contains("..") && !value.startsWith("/") && !value.contains("\\");
	}
}
