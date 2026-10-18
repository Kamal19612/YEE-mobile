package com.afrea.yee.media;

import com.afrea.yee.common.exception.AppException;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class AudioUploadValidator {

	public static final long MAX_BYTES = 20L * 1024 * 1024;
	private static final Set<String> ALLOWED = Set.of(
			"audio/mpeg",
			"audio/mp4",
			"audio/aac",
			"audio/ogg",
			"audio/webm",
			"audio/x-m4a",
			"audio/wav",
			"audio/wave",
			"audio/x-wav");

	public ValidatedAudio validate(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new AppException("missing_file", "Aucun fichier reçu.", HttpStatus.BAD_REQUEST);
		}
		if (file.getSize() > MAX_BYTES) {
			throw new AppException("file_too_large", "L’audio ne doit pas dépasser 20 Mo.", HttpStatus.UNPROCESSABLE_ENTITY);
		}
		byte[] bytes;
		try {
			bytes = file.getBytes();
		} catch (IOException ex) {
			throw new AppException("upload_error", "Erreur lors du transfert du fichier.", HttpStatus.UNPROCESSABLE_ENTITY);
		}
		String mime = detectMime(bytes);
		if (!ALLOWED.contains(mime)) {
			throw new AppException(
					"invalid_file_type",
					"Seuls les formats MP3, M4A, AAC, WAV, OGG et WebM audio sont acceptés.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		String ext = switch (mime) {
			case "audio/ogg" -> "ogg";
			case "audio/webm" -> "webm";
			case "audio/mp4", "audio/x-m4a", "audio/aac" -> "m4a";
			case "audio/wav", "audio/wave", "audio/x-wav" -> "wav";
			default -> "mp3";
		};
		return new ValidatedAudio(bytes, normalizeMime(mime), ext);
	}

	static String normalizeMime(String mime) {
		return switch (mime) {
			case "audio/wave", "audio/x-wav" -> "audio/wav";
			case "audio/x-m4a", "audio/aac" -> "audio/mp4";
			default -> mime;
		};
	}

	static String detectMime(byte[] bytes) {
		if (bytes.length >= 3 && bytes[0] == 'I' && bytes[1] == 'D' && bytes[2] == '3') {
			return "audio/mpeg";
		}
		if (bytes.length >= 2 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xE0) == 0xE0) {
			return "audio/mpeg";
		}
		if (bytes.length >= 12
				&& bytes[0] == 'R'
				&& bytes[1] == 'I'
				&& bytes[2] == 'F'
				&& bytes[3] == 'F'
				&& bytes[8] == 'W'
				&& bytes[9] == 'A'
				&& bytes[10] == 'V'
				&& bytes[11] == 'E') {
			return "audio/wav";
		}
		if (bytes.length >= 4 && bytes[0] == 'O' && bytes[1] == 'g' && bytes[2] == 'g' && bytes[3] == 'S') {
			return "audio/ogg";
		}
		if (bytes.length >= 4
				&& (bytes[0] & 0xFF) == 0x1A
				&& (bytes[1] & 0xFF) == 0x45
				&& (bytes[2] & 0xFF) == 0xDF
				&& (bytes[3] & 0xFF) == 0xA3) {
			return "audio/webm";
		}
		if (bytes.length >= 8
				&& bytes[4] == 'f' && bytes[5] == 't' && bytes[6] == 'y' && bytes[7] == 'p') {
			return "audio/mp4";
		}
		return "application/octet-stream";
	}

	public record ValidatedAudio(byte[] bytes, String contentType, String extension) {
		public String contentTypeNormalized() {
			return contentType.toLowerCase(Locale.ROOT);
		}
	}
}
