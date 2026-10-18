package com.afrea.yee.media;

import com.afrea.yee.common.ApiPaths;
import com.afrea.yee.common.config.AppProperties;
import com.afrea.yee.common.exception.AppException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalObjectStorage implements ObjectStorage {

	private final AppProperties appProperties;

	public LocalObjectStorage(AppProperties appProperties) {
		this.appProperties = appProperties;
	}

	@Override
	public StoredObject upload(String bucket, String objectPath, byte[] content, String contentType) {
		try {
			Path target = resolveInsideRoot(bucket, objectPath);
			Files.createDirectories(target.getParent());
			Files.write(target, content);
			String base = publicBaseForBucket(bucket);
			String url = base + "/" + bucket + "/" + objectPath;
			return new StoredObject(bucket, objectPath, url);
		} catch (IOException ex) {
			throw new IllegalStateException("Local storage upload failed", ex);
		}
	}

	@Override
	public byte[] read(String bucket, String objectPath) {
		Path target = resolveInsideRoot(bucket, objectPath);
		if (!Files.isRegularFile(target)) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
		try {
			return Files.readAllBytes(target);
		} catch (IOException ex) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
	}

	@Override
	public Resource openResource(String bucket, String objectPath) {
		Path target = resolveInsideRoot(bucket, objectPath);
		if (!Files.isRegularFile(target)) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
		return new FileSystemResource(target);
	}

	@Override
	public long size(String bucket, String objectPath) {
		Path target = resolveInsideRoot(bucket, objectPath);
		if (!Files.isRegularFile(target)) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
		try {
			return Files.size(target);
		} catch (IOException ex) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
	}

	@Override
	public void delete(String bucket, String objectPath) {
		try {
			Path target = resolveInsideRoot(bucket, objectPath);
			Files.deleteIfExists(target);
		} catch (RuntimeException | IOException ignored) {
			// best-effort cleanup ; un chemin hors racine est ignoré
		}
	}

	/**
	 * Avatars / covers : {@code /media/…} (handler statique).
	 * post-media : {@code /api/media/…} (RestController sous préfixe API).
	 */
	private String publicBaseForBucket(String bucket) {
		// Bucket servi par PostMediaController (RestController → /api/media/…).
		if ("post-media".equals(bucket)) {
			return ApiPaths.ROOT + "/media";
		}
		return appProperties.getStorage().getLocalPublicBaseUrl().replaceAll("/+$", "");
	}

	/**
	 * Refuse tout chemin qui sortirait du dossier de stockage
	 * ({@code ..}, lien absolu, séparateur Windows).
	 */
	private Path resolveInsideRoot(String bucket, String objectPath) {
		if (bucket == null || bucket.isBlank() || bucket.contains("..") || bucket.contains("/") || bucket.contains("\\")) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
		if (objectPath == null || objectPath.isBlank() || objectPath.contains("..") || objectPath.startsWith("/")
				|| objectPath.contains("\\")) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
		Path root = Path.of(appProperties.getStorage().getLocalRoot()).toAbsolutePath().normalize();
		Path target = root.resolve(bucket).resolve(objectPath).normalize();
		if (!target.startsWith(root)) {
			throw new AppException("not_found", "Média introuvable.", HttpStatus.NOT_FOUND);
		}
		return target;
	}
}
