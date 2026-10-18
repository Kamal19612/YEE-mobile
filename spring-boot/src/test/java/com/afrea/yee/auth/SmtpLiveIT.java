package com.afrea.yee.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;

/**
 * Envoi SMTP réel contre la config d'environnement ({@code SPRING_MAIL_*}).
 * <p>
 * Ignoré si {@code SPRING_MAIL_HOST} est absent. Destinataire :
 * {@code SMTP_TEST_TO}, sinon {@code SPRING_MAIL_USERNAME}.
 * Ne journalise jamais le mot de passe.
 */
@EnabledIfEnvironmentVariable(named = "SPRING_MAIL_HOST", matches = ".+")
class SmtpLiveIT {

	@Test
	void smtpAcceptsAuthenticatedMessage() throws Exception {
		String host = env("SPRING_MAIL_HOST");
		assumeTrue(host != null && !host.isBlank(), "SPRING_MAIL_HOST manquant");

		int port = parsePort(env("SPRING_MAIL_PORT"), 587);
		boolean auth = parseBool(env("SPRING_MAIL_SMTP_AUTH"), false);
		boolean startTls = parseBool(env("SPRING_MAIL_SMTP_STARTTLS"), false);
		// Même défaut que application.yml (pas d'inférence sur le port).
		boolean ssl = parseBool(env("SPRING_MAIL_SMTP_SSL"), false);
		String username = blankToNull(env("SPRING_MAIL_USERNAME"));
		String password = env("SPRING_MAIL_PASSWORD");
		String from = firstNonBlank(env("APP_MAIL_FROM"), username, "noreply@localhost");
		String to = firstNonBlank(env("SMTP_TEST_TO"), username);
		assumeTrue(to != null && !to.isBlank(), "Aucun destinataire (SMTP_TEST_TO ou SPRING_MAIL_USERNAME)");

		JavaMailSenderImpl sender = new JavaMailSenderImpl();
		sender.setHost(host);
		sender.setPort(port);
		if (username != null) {
			sender.setUsername(username);
		}
		if (password != null) {
			sender.setPassword(password);
		}

		Properties props = sender.getJavaMailProperties();
		props.put("mail.transport.protocol", "smtp");
		props.put("mail.smtp.auth", Boolean.toString(auth));
		props.put("mail.smtp.starttls.enable", Boolean.toString(startTls));
		props.put("mail.smtp.starttls.required", Boolean.toString(startTls));
		props.put("mail.smtp.ssl.enable", Boolean.toString(ssl));
		props.put("mail.smtp.connectiontimeout", "15000");
		props.put("mail.smtp.timeout", "15000");
		props.put("mail.smtp.writetimeout", "15000");

		MimeMessage message = sender.createMimeMessage();
		MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
		helper.setFrom(from);
		helper.setTo(to);
		helper.setSubject("[YEE SMTP test] " + Instant.now());
		helper.setText(
				"Message de test SMTP AfrEA-YEE.\n"
						+ "Si vous lisez ceci, l'authentification et l'envoi SMTP fonctionnent.\n"
						+ "host=" + host + " port=" + port + " auth=" + auth
						+ " starttls=" + startTls + " ssl=" + ssl + "\n",
				false);

		try {
			sender.send(message);
		} catch (Exception ex) {
			Throwable root = ex;
			while (root.getCause() != null && root.getCause() != root) {
				root = root.getCause();
			}
			throw new AssertionError(
					"Échec SMTP host=" + host
							+ " port=" + port
							+ " auth=" + auth
							+ " starttls=" + startTls
							+ " ssl=" + ssl
							+ " fromConfigured=" + (from != null)
							+ " toConfigured=" + (to != null)
							+ " | " + ex.getClass().getSimpleName() + ": " + sanitize(ex.getMessage())
							+ " | cause=" + root.getClass().getSimpleName() + ": " + sanitize(root.getMessage()),
					ex);
		}

		assertThat(host).isNotBlank();
	}

	private static String env(String key) {
		String value = System.getenv(key);
		return value == null ? null : value.trim();
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value;
	}

	private static String firstNonBlank(String... values) {
		if (values == null) {
			return null;
		}
		for (String value : values) {
			if (value != null && !value.isBlank()) {
				return value.trim();
			}
		}
		return null;
	}

	private static int parsePort(String raw, int fallback) {
		if (raw == null || raw.isBlank()) {
			return fallback;
		}
		try {
			return Integer.parseInt(raw.trim());
		} catch (NumberFormatException ex) {
			return fallback;
		}
	}

	private static boolean parseBool(String raw, boolean fallback) {
		if (raw == null || raw.isBlank()) {
			return fallback;
		}
		return switch (raw.trim().toLowerCase()) {
			case "1", "true", "yes", "on" -> true;
			case "0", "false", "no", "off" -> false;
			default -> fallback;
		};
	}

	/** Retire d'éventuels secrets collés dans le message d'erreur Jakarta Mail. */
	private static String sanitize(String message) {
		if (message == null) {
			return "";
		}
		String password = env("SPRING_MAIL_PASSWORD");
		String cleaned = message;
		if (password != null && !password.isBlank()) {
			cleaned = cleaned.replace(password, "***");
		}
		return cleaned.replaceAll("(?i)password[=:]\\S+", "password=***");
	}
}
