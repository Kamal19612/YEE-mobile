package com.afrea.yee.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.common.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

class AuthEmailServiceTest {

	AppProperties properties;
	JavaMailSender sender;
	ObjectProvider<JavaMailSender> provider;
	MimeMessage mimeMessage;

	@BeforeEach
	@SuppressWarnings("unchecked")
	void setUp() {
		properties = new AppProperties();
		properties.setFrontendUrl("http://localhost:5173");
		properties.getMail().setFrom("YEE <noreply@example.org>");
		sender = mock(JavaMailSender.class);
		provider = mock(ObjectProvider.class);
		mimeMessage = mock(MimeMessage.class);
		when(sender.createMimeMessage()).thenReturn(mimeMessage);
	}

	@Test
	void sendsWhenSmtpHostIsConfigured() {
		when(provider.getIfAvailable()).thenReturn(sender);
		AuthEmailService service = new AuthEmailService(properties, provider, "127.0.0.1", "");

		String url = service.sendVerificationEmail("user@example.org", "raw-token-value");

		assertThat(url).contains("/verify-email").contains("token=raw-token-value");
		assertThat(service.isMailConfigured()).isTrue();
		verify(sender).send(mimeMessage);
	}

	@Test
	void skipsWhenSmtpHostMissing() {
		when(provider.getIfAvailable()).thenReturn(sender);
		AuthEmailService service = new AuthEmailService(properties, provider, "", "");

		service.sendPasswordResetEmail("user@example.org", "raw-token-value");

		assertThat(service.isMailConfigured()).isFalse();
		verify(sender, never()).send(any(MimeMessage.class));
	}

	@Test
	void sendsPasswordResetWhenSmtpConfigured() {
		when(provider.getIfAvailable()).thenReturn(sender);
		AuthEmailService service = new AuthEmailService(properties, provider, "smtp.example", "mailer");

		String url = service.sendPasswordResetEmail("user@example.org", "raw-reset-token");

		assertThat(url).contains("/reset-password").contains("token=raw-reset-token");
		verify(sender).send(mimeMessage);
	}
}
