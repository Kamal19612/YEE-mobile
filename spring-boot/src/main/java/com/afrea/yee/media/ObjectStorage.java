package com.afrea.yee.media;

import org.springframework.core.io.Resource;

public interface ObjectStorage {

	StoredObject upload(String bucket, String objectPath, byte[] content, String contentType);

	/**
	 * Lit un objet déjà stocké. Sert les pièces jointes de messages, qui ne
	 * doivent pas passer par une URL publique.
	 */
	byte[] read(String bucket, String objectPath);

	/**
	 * Ressource streamable (Range HTTP). Préférer FileSystemResource en local.
	 */
	Resource openResource(String bucket, String objectPath);

	/** Taille en octets ; -1 si inconnue. */
	long size(String bucket, String objectPath);

	void delete(String bucket, String objectPath);
}
