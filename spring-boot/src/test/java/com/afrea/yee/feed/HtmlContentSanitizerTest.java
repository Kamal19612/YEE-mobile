package com.afrea.yee.feed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.afrea.yee.common.config.AppProperties;
import java.net.InetAddress;
import org.junit.jupiter.api.Test;

class HtmlContentSanitizerTest {

	private final HtmlContentSanitizer sanitizer = new HtmlContentSanitizer();

	@Test
	void stripsScriptsAndDangerousTags() {
		String cleaned = sanitizer.sanitize(
				"<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)><iframe src=\"https://x\"></iframe>");
		assertThat(cleaned).doesNotContain("script", "iframe", "img", "onerror");
		assertThat(cleaned).contains("ok");
	}

	@Test
	void forcesRelAndTargetOnAnchors() {
		String cleaned = sanitizer.sanitize("<a href=\"https://example.com\">link</a>");
		assertThat(cleaned).contains("rel=\"noopener noreferrer nofollow\"");
		assertThat(cleaned).contains("target=\"_blank\"");
	}

	@Test
	void rejectsJavascriptProtocolViaClean() {
		String cleaned = sanitizer.sanitize("<a href=\"javascript:alert(1)\">x</a>");
		assertThat(cleaned).doesNotContain("javascript:");
	}

	@Test
	void sanitizeOnReadIsIdempotentForAlreadyCleanHtml() {
		String once = sanitizer.sanitize("<p>Hello <strong>YEE</strong></p><script>x</script>");
		assertThat(sanitizer.sanitize(once)).isEqualTo(once);
		assertThat(once).doesNotContain("script");
	}
}

class LinkPreviewSsrfExtraTest {

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
	void validateUrlRejectsNonHttpAndBlockedHost() {
		AppProperties props = new AppProperties();
		props.setFrontendUrl("https://yee.example");
		props.getLinkPreview().setBlockedHosts("evil.internal");
		LinkPreviewService svc = new LinkPreviewService(null, props, null);

		assertThatThrownBy(() -> svc.validateUrl("file:///etc/passwd")).isInstanceOf(Exception.class);
		assertThatThrownBy(() -> svc.validateUrl("ftp://example.com/x")).isInstanceOf(Exception.class);
		assertThatThrownBy(() -> svc.validateUrl("https://evil.internal/path")).isInstanceOf(Exception.class);
		assertThatThrownBy(() -> svc.validateUrl("https://yee.example/self")).isInstanceOf(Exception.class);
	}
}
