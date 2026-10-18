package com.afrea.yee.events;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class VideoLinkParserTest {

	@Test
	void parsesYoutubeWatchUrl() {
		var parsed = VideoLinkParser.parse("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		assertThat(parsed.provider()).isEqualTo("youtube");
		assertThat(parsed.externalId()).isEqualTo("dQw4w9WgXcQ");
		assertThat(parsed.embedUrl()).isEqualTo("https://www.youtube.com/embed/dQw4w9WgXcQ");
	}

	@Test
	void parsesYoutuBeShortUrl() {
		var parsed = VideoLinkParser.parse("https://youtu.be/dQw4w9WgXcQ");
		assertThat(parsed.externalId()).isEqualTo("dQw4w9WgXcQ");
	}

	@Test
	void parsesLinkedInAsExternal() {
		var parsed = VideoLinkParser.parse("https://www.linkedin.com/posts/example-activity-123");
		assertThat(parsed.provider()).isEqualTo("linkedin");
		assertThat(parsed.embedUrl()).isNull();
	}

	@Test
	void parsesGoogleDriveFileLink() {
		var parsed = VideoLinkParser.parse(
				"https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing");
		assertThat(parsed.provider()).isEqualTo("drive");
		assertThat(parsed.externalId()).isEqualTo("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
		assertThat(parsed.embedUrl()).contains("/preview");
	}

	@Test
	void parsesGoogleDriveOpenIdLink() {
		var parsed = VideoLinkParser.parse(
				"https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
		assertThat(parsed.provider()).isEqualTo("drive");
		assertThat(parsed.externalId()).isEqualTo("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms");
	}

	@Test
	void rejectsNonHttp() {
		assertThatThrownBy(() -> VideoLinkParser.parse("ftp://example.com/v"))
				.isInstanceOf(IllegalArgumentException.class);
	}
}
