package com.afrea.yee.feed;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

@Component
public class HtmlContentSanitizer {

	public static final int MAX_PLAIN_LENGTH = 3000;

	private static final Safelist SAFELIST = Safelist.none()
			.addTags("br", "p", "b", "strong", "i", "em", "a")
			.addAttributes("a", "href", "rel", "target")
			.addProtocols("a", "href", "http", "https");

	public String sanitize(String rawHtml) {
		String cleaned = Jsoup.clean(rawHtml == null ? "" : rawHtml, SAFELIST);
		Document doc = Jsoup.parseBodyFragment(cleaned);
		for (Element a : doc.select("a")) {
			a.attr("rel", "noopener noreferrer nofollow");
			if (!a.hasAttr("target")) {
				a.attr("target", "_blank");
			}
		}
		return doc.body().html();
	}

	public int plainLength(String html) {
		return Jsoup.parseBodyFragment(html == null ? "" : html).text().length();
	}

	public String firstHttpUrl(String htmlOrText) {
		String text = htmlOrText == null ? "" : htmlOrText;
		java.util.regex.Matcher m = java.util.regex.Pattern
				.compile("https?://[^\\s\"'<>]+", java.util.regex.Pattern.CASE_INSENSITIVE)
				.matcher(text);
		if (m.find()) {
			return m.group().replaceAll("[\\),\\.]+$", "");
		}
		return null;
	}
}
