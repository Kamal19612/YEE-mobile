package com.afrea.yee.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.afrea.yee.common.exception.AppException;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ImageUploadValidatorTest {

	private final ImageUploadValidator validator = new ImageUploadValidator();

	@Test
	void acceptsJpegMagicBytes() {
		byte[] jpeg = new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x10};
		// Minimal bytes won't pass ImageIO — use detectMime unit via PNG header only path
		assertThat(ImageUploadValidator.detectMime(jpeg)).isEqualTo("image/jpeg");
	}

	@Test
	void rejectsNonImage() {
		MockMultipartFile file = new MockMultipartFile(
				"file", "x.txt", "text/plain", "hello-world-not-image".getBytes());
		assertThatThrownBy(() -> validator.validate(file))
				.isInstanceOf(AppException.class)
				.extracting(ex -> ((AppException) ex).getCode())
				.isEqualTo("invalid_file_type");
	}

	@Test
	void detectsPngAndWebp() {
		byte[] png = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
		assertThat(ImageUploadValidator.detectMime(png)).isEqualTo("image/png");

		byte[] webp = new byte[] {
				'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'
		};
		assertThat(ImageUploadValidator.detectMime(webp)).isEqualTo("image/webp");
	}

	@Test
	void webpDecoderIsInstalled() {
		assertThat(ImageIO.getImageReadersByMIMEType("image/webp").hasNext()).isTrue();
	}

	@Test
	void rejectsWebpThatOnlyMimicsTheHeader() {
		byte[] fake = new byte[32];
		fake[0] = 'R';
		fake[1] = 'I';
		fake[2] = 'F';
		fake[3] = 'F';
		fake[8] = 'W';
		fake[9] = 'E';
		fake[10] = 'B';
		fake[11] = 'P';
		MockMultipartFile file = new MockMultipartFile("file", "x.webp", "image/webp", fake);
		assertThatThrownBy(() -> validator.validate(file))
				.isInstanceOf(AppException.class)
				.extracting(ex -> ((AppException) ex).getCode())
				.isEqualTo("invalid_image");
	}
}
