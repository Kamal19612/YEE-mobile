package com.afrea.yee.media;

import com.afrea.yee.common.exception.AppException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class ImageUploadValidator {

	public static final long MAX_BYTES = 5L * 1024 * 1024;
	private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/png", "image/webp");

	public ValidatedImage validate(MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new AppException("missing_file", "Aucun fichier reçu.", HttpStatus.BAD_REQUEST);
		}
		if (file.getSize() > MAX_BYTES) {
			throw new AppException("file_too_large", "L’image ne doit pas dépasser 5 Mo.", HttpStatus.UNPROCESSABLE_ENTITY);
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
					"Seuls les formats JPEG, PNG et WebP sont acceptés.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}

		try {
			BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
			if (image == null) {
				throw new AppException("invalid_image", "Le fichier n’est pas une image valide.", HttpStatus.UNPROCESSABLE_ENTITY);
			}
		} catch (IOException ex) {
			throw new AppException("invalid_image", "Le fichier n’est pas une image valide.", HttpStatus.UNPROCESSABLE_ENTITY);
		}

		String ext = switch (mime) {
			case "image/png" -> "png";
			case "image/webp" -> "webp";
			default -> "jpg";
		};
		return new ValidatedImage(bytes, mime, ext);
	}

	static String detectMime(byte[] bytes) {
		if (bytes.length >= 3
				&& (bytes[0] & 0xFF) == 0xFF
				&& (bytes[1] & 0xFF) == 0xD8
				&& (bytes[2] & 0xFF) == 0xFF) {
			return "image/jpeg";
		}
		if (bytes.length >= 8
				&& (bytes[0] & 0xFF) == 0x89
				&& bytes[1] == 0x50
				&& bytes[2] == 0x4E
				&& bytes[3] == 0x47) {
			return "image/png";
		}
		if (bytes.length >= 12
				&& bytes[0] == 'R'
				&& bytes[1] == 'I'
				&& bytes[2] == 'F'
				&& bytes[3] == 'F'
				&& bytes[8] == 'W'
				&& bytes[9] == 'E'
				&& bytes[10] == 'B'
				&& bytes[11] == 'P') {
			return "image/webp";
		}
		return "application/octet-stream";
	}

	public record ValidatedImage(byte[] bytes, String contentType, String extension) {
		public String contentTypeNormalized() {
			return contentType.toLowerCase(Locale.ROOT);
		}
	}
}
