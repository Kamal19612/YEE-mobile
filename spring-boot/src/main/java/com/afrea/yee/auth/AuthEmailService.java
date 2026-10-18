package com.afrea.yee.auth;

import com.afrea.yee.common.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Mails transactionnels uniquement : vérification d'e-mail et mot de passe oublié.
 * <p>
 * Aucune notification métier (messages, likes, groupes, etc.) n'est envoyée par mail.
 * Sans {@code SPRING_MAIL_HOST}, aucun envoi (le lien est seulement renvoyé
 * au client si le profil dev active expose-email-links). Avec un hôte SMTP,
 * le jeton n'apparaît jamais dans les logs.
 */
@Service
public class AuthEmailService {

	private static final Logger log = LoggerFactory.getLogger(AuthEmailService.class);

	private final AppProperties appProperties;
	private final ObjectProvider<JavaMailSender> mailSender;
	private final String mailHost;
	private final String mailUsername;

	public AuthEmailService(
			AppProperties appProperties,
			ObjectProvider<JavaMailSender> mailSender,
			@Value("${spring.mail.host:}") String mailHost,
			@Value("${spring.mail.username:}") String mailUsername) {
		this.appProperties = appProperties;
		this.mailSender = mailSender;
		this.mailHost = mailHost == null ? "" : mailHost.trim();
		this.mailUsername = mailUsername == null ? "" : mailUsername.trim();
	}

	/**
	 * @return URL de vérification (pour l'exposition JSON en profil dev uniquement).
	 */
	public String sendVerificationEmail(String email, String token) {
		String url = frontendUrl("/verify-email", token);
		String body = """
				Bonjour,

				Confirmez votre compte AfrEA-YEE en ouvrant ce lien :
				%s

				Hello,

				Confirm your AfrEA-YEE account by opening this link:
				%s

				— AfrEA-YEE
				""".formatted(url, url);
		dispatch(email, "Vérifiez votre compte AfrEA-YEE / Verify your AfrEA-YEE account", body);
		return url;
	}

	/**
	 * @return URL de réinitialisation (même règle que la vérification).
	 */
	public String sendPasswordResetEmail(String email, String token) {
		String url = frontendUrl("/reset-password", token);
		String body = """
				Bonjour,

				Réinitialisez votre mot de passe AfrEA-YEE :
				%s

				Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.

				Hello,

				Reset your AfrEA-YEE password:
				%s

				If you did not request this, ignore this message.

				— AfrEA-YEE
				""".formatted(url, url);
		dispatch(email, "Réinitialisation du mot de passe / Password reset — AfrEA-YEE", body);
		return url;
	}

	public boolean shouldExposeLinks() {
		return appProperties.getDev().isExposeEmailLinks();
	}

	public boolean isMailConfigured() {
		return !mailHost.isBlank() && mailSender.getIfAvailable() != null;
	}

	private void dispatch(String to, String subject, String text) {
		JavaMailSender sender = mailSender.getIfAvailable();
		if (mailHost.isBlank() || sender == null) {
			log.info("[auth-email] skipped (no SMTP host) to={}", to);
			return;
		}
		try {
			MimeMessage message = sender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
			helper.setFrom(fromAddress());
			helper.setTo(to);
			helper.setSubject(subject);
			helper.setText(text, false);
			sender.send(message);
			log.info("[auth-email] sent to={}", to);
		} catch (Exception ex) {
			// Le compte / le jeton restent en base. Pas de jeton dans le journal.
			Throwable root = ex;
			while (root.getCause() != null && root.getCause() != root) {
				root = root.getCause();
			}
			log.error("[auth-email] send failed to={}: {} | cause={}", to, ex.toString(), root.toString());
		}
	}

	private String fromAddress() {
		String configured = appProperties.getMail().getFrom();
		if (configured != null && !configured.isBlank()) {
			return configured.trim();
		}
		if (!mailUsername.isBlank()) {
			return mailUsername;
		}
		return "noreply@localhost";
	}

	private String frontendUrl(String path, String token) {
		String base = appProperties.getFrontendUrl();
		if (base == null || base.isBlank()) {
			return path + "?token=" + token;
		}
		return UriComponentsBuilder.fromUriString(base.replaceAll("/+$", ""))
				.path(path)
				.queryParam("token", token)
				.build(true)
				.toUriString();
	}

}
