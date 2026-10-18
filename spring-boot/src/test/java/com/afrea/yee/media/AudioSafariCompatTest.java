package com.afrea.yee.media;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AudioSafariCompatTest {

	@Test
	void leavesSafariFriendlyFormatsUntouched() {
		AudioSafariCompat compat = new AudioSafariCompat(false);
		byte[] bytes = new byte[] {1, 2, 3};
		AudioUploadValidator.ValidatedAudio input =
				new AudioUploadValidator.ValidatedAudio(bytes, "audio/mpeg", "mp3");
		AudioUploadValidator.ValidatedAudio out = compat.ensurePlayable(input);
		assertThat(out).isSameAs(input);
	}

	@Test
	void leavesWebmWhenFfmpegMissing() {
		AudioSafariCompat compat = new AudioSafariCompat(false);
		byte[] bytes = new byte[] {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 0, 1};
		AudioUploadValidator.ValidatedAudio input =
				new AudioUploadValidator.ValidatedAudio(bytes, "audio/webm", "webm");
		AudioUploadValidator.ValidatedAudio out = compat.ensurePlayable(input);
		assertThat(out.contentType()).isEqualTo("audio/webm");
		assertThat(out.extension()).isEqualTo("webm");
	}

	@Test
	void recognizesSafariFriendlyMimes() {
		assertThat(AudioSafariCompat.isSafariFriendly("audio/mp4")).isTrue();
		assertThat(AudioSafariCompat.isSafariFriendly("audio/wav")).isTrue();
		assertThat(AudioSafariCompat.isSafariFriendly("audio/webm")).isFalse();
		assertThat(AudioSafariCompat.isSafariFriendly("audio/ogg")).isFalse();
	}
}
