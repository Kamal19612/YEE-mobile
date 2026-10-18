package com.afrea.yee.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.afrea.yee.common.exception.AppException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class AudioUploadValidatorTest {

	private final AudioUploadValidator validator = new AudioUploadValidator();

	@Test
	void detectsWavMagicBytes() {
		byte[] wav = new byte[16];
		wav[0] = 'R';
		wav[1] = 'I';
		wav[2] = 'F';
		wav[3] = 'F';
		wav[8] = 'W';
		wav[9] = 'A';
		wav[10] = 'V';
		wav[11] = 'E';
		assertThat(AudioUploadValidator.detectMime(wav)).isEqualTo("audio/wav");
	}

	@Test
	void acceptsWavUpload() {
		byte[] wav = new byte[64];
		wav[0] = 'R';
		wav[1] = 'I';
		wav[2] = 'F';
		wav[3] = 'F';
		wav[8] = 'W';
		wav[9] = 'A';
		wav[10] = 'V';
		wav[11] = 'E';
		MockMultipartFile file = new MockMultipartFile("audio", "voice.wav", "audio/wav", wav);
		AudioUploadValidator.ValidatedAudio validated = validator.validate(file);
		assertThat(validated.contentType()).isEqualTo("audio/wav");
		assertThat(validated.extension()).isEqualTo("wav");
	}

	@Test
	void rejectsUnknownBytes() {
		MockMultipartFile file = new MockMultipartFile(
				"audio", "x.bin", "application/octet-stream", "not-audio".getBytes());
		assertThatThrownBy(() -> validator.validate(file))
				.isInstanceOf(AppException.class)
				.extracting(ex -> ((AppException) ex).getCode())
				.isEqualTo("invalid_file_type");
	}
}
