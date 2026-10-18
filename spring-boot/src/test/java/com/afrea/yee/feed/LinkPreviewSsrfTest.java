package com.afrea.yee.feed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.InetAddress;
import org.junit.jupiter.api.Test;

class LinkPreviewSsrfTest {

	@Test
	void blocksPrivateAndMetadataIps() throws Exception {
		assertThat(LinkPreviewService.isBlockedIp(InetAddress.getByName("127.0.0.1"))).isTrue();
		assertThat(LinkPreviewService.isBlockedIp(InetAddress.getByName("10.0.0.5"))).isTrue();
		assertThat(LinkPreviewService.isBlockedIp(InetAddress.getByName("192.168.1.1"))).isTrue();
		assertThat(LinkPreviewService.isBlockedIp(InetAddress.getByName("172.16.0.1"))).isTrue();
		assertThat(LinkPreviewService.isBlockedIp(InetAddress.getByName("169.254.169.254"))).isTrue();
		assertThat(LinkPreviewService.isBlockedIp(InetAddress.getByName("100.64.1.1"))).isTrue();
		assertThat(LinkPreviewService.isBlockedIp(InetAddress.getByName("8.8.8.8"))).isFalse();
	}

	@Test
	void htmlSanitizerStripsScriptsAndForcesRel() {
		HtmlContentSanitizer sanitizer = new HtmlContentSanitizer();
		String cleaned = sanitizer.sanitize("<p>Hi <script>alert(1)</script><a href=\"https://ex.com\">x</a></p>");
		assertThat(cleaned).doesNotContain("script");
		assertThat(cleaned).contains("rel=\"noopener noreferrer nofollow\"");
		assertThat(sanitizer.plainLength(cleaned)).isLessThanOrEqualTo(HtmlContentSanitizer.MAX_PLAIN_LENGTH);
	}

	@Test
	void validateUrlRejectsNonHttp() {
		LinkPreviewService svc = new LinkPreviewService(null, new com.afrea.yee.common.config.AppProperties(), null);
		assertThatThrownBy(() -> svc.validateUrl("file:///etc/passwd"))
				.isInstanceOf(Exception.class);
	}
}
