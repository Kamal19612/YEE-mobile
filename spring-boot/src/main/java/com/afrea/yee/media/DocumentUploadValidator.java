package com.afrea.yee.media;

import com.afrea.yee.common.exception.AppException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Validation PDF pour pièces jointes du fil.
 * Magic bytes uniquement — l’extension client n’est pas une preuve.
 */
@Component
public class DocumentUploadValidator {

	public static final long MAX_BYTES = 15L * 1024 * 1024;
	private static final int MAX_FILENAME_LENGTH = 180;

	public ValidatedDocument validate(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new AppException("missing_file", "Aucun fichier reçu.", HttpStatus.BAD_REQUEST);
		}
		if (file.getSize() > MAX_BYTES) {
			throw new AppException(
					"file_too_large",
					"Le document ne doit pas dépasser 15 Mo.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		byte[] bytes;
		try {
			bytes = file.getBytes();
		} catch (IOException ex) {
			throw new AppException(
					"upload_error",
					"Erreur lors du transfert du fichier.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		if (!isPdf(bytes)) {
			throw new AppException(
					"invalid_file_type",
					"Seuls les fichiers PDF sont acceptés.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		String filename = sanitizeFilename(file.getOriginalFilename());
		return new ValidatedDocument(bytes, "application/pdf", "pdf", filename, bytes.length);
	}

	static boolean isPdf(byte[] bytes) {
		if (bytes == null || bytes.length < 5) {
			return false;
		}
		return bytes[0] == '%'
				&& bytes[1] == 'P'
				&& bytes[2] == 'D'
				&& bytes[3] == 'F'
				&& bytes[4] == '-';
	}

	static String sanitizeFilename(String raw) {
		String name = raw == null ? "" : raw.trim();
		int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
		if (slash >= 0) {
			name = name.substring(slash + 1);
		}
		name = name.replaceAll("[\\x00-\\x1F\\x7F]", "");
		name = name.replaceAll("[\"'<>:`|*?]", "");
		name = name.replaceAll("\\s+", " ").trim();
		if (name.isBlank()) {
			name = "document.pdf";
		}
		if (!name.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
			name = name + ".pdf";
		}
		if (name.length() > MAX_FILENAME_LENGTH) {
			String base = name.substring(0, Math.max(1, MAX_FILENAME_LENGTH - 4));
			name = base + ".pdf";
		}
		// Évite les noms uniquement « .pdf »
		String stem = name.substring(0, name.length() - 4).trim();
		if (stem.isBlank() || stem.chars().allMatch(ch -> ch == '.' || ch == '-' || ch == '_')) {
			return "document.pdf";
		}
		return new String(name.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
	}

	public record ValidatedDocument(
			byte[] bytes, String contentType, String extension, String originalFilename, long byteSize) {
	}
}
