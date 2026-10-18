package com.afrea.yee.resources.dto;

/**
 * Contrat public d’une ressource bibliothèque.
 * {@code coverUrl} est une miniature page 1 (JPEG) quand disponible.
 * {@code byteSize} permet d’adapter l’UX mobile (éviter l’auto-preview des gros fichiers).
 */
public record ResourceResponse(
		String id,
		String title,
		String slug,
		String categoryId,
		String categorySlug,
		String categoryName,
		String language,
		String description,
		String originalFilename,
		String mimeType,
		String fileUrl,
		String coverUrl,
		Long byteSize,
		String status,
		String createdAt,
		String updatedAt,
		String createdByName
) {
}
