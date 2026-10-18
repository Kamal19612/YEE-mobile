package com.afrea.yee.auth;

import com.afrea.yee.auth.dto.AuthUserResponse;
import com.afrea.yee.auth.dto.ForgotPasswordRequest;
import com.afrea.yee.auth.dto.LoginRequest;
import com.afrea.yee.auth.dto.RegisterRequest;
import com.afrea.yee.auth.dto.ResetPasswordRequest;
import com.afrea.yee.auth.dto.SessionResponse;
import com.afrea.yee.auth.dto.TokenRequest;
import com.afrea.yee.users.UserTransformer;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.auth.security.JwtService;
import com.afrea.yee.common.exception.AppException;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

	/** Délai minimum entre deux e-mails de confirmation pour le même compte. */
	public static final Duration VERIFICATION_RESEND_COOLDOWN = Duration.ofMinutes(2);

	public static final int VERIFICATION_RESEND_COOLDOWN_SECONDS =
			(int) VERIFICATION_RESEND_COOLDOWN.toSeconds();

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final RefreshTokenService refreshTokenService;
	private final RateLimiter rateLimiter;
	private final AuthEmailService authEmailService;

	public AuthService(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder,
			JwtService jwtService,
			RefreshTokenService refreshTokenService,
			RateLimiter rateLimiter,
			AuthEmailService authEmailService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.refreshTokenService = refreshTokenService;
		this.rateLimiter = rateLimiter;
		this.authEmailService = authEmailService;
	}

	@Transactional
	public RegisterOutcome register(RegisterRequest request, String ip) {
		if (rateLimiter.isRateLimited("register", ip, 5, Duration.ofHours(1))) {
			throw new AppException("rate_limited", "Trop de tentatives, réessayez plus tard.", HttpStatus.TOO_MANY_REQUESTS);
		}

		String email = normalizeEmail(request.email());
		String displayName = request.displayName() == null ? "" : request.displayName().trim();

		// Anti-énumération (ordre PHP) : email déjà pris → 202 générique, sans valider le reste.
		if (userRepository.existsByEmailIgnoreCase(email)) {
			return RegisterOutcome.emailAlreadyUsed();
		}

		Map<String, Object> fieldErrors = new LinkedHashMap<>();
		List<String> passwordErrors = PasswordPolicy.errors(request.password());
		if (!passwordErrors.isEmpty()) {
			fieldErrors.put("password", passwordErrors);
		}
		if (displayName.length() < 2 || displayName.length() > 60) {
			fieldErrors.put("displayName", "Le nom doit contenir entre 2 et 60 caractères.");
		}
		if (!fieldErrors.isEmpty()) {
			throw validationFailed(fieldErrors);
		}

		User user = new User();
		user.setEmail(email);
		user.setPasswordHash(passwordEncoder.encode(request.password()));
		user.setDisplayName(displayName);
		user.setEmailVerified(false);

		userRepository.save(user);
		user.setMentionName(UserTransformer.slugifyMention(displayName, user.getId()));
		String verificationUrl = issueVerificationEmail(user);
		userRepository.save(user);

		return RegisterOutcome.accountCreated(verificationUrl);
	}

	/**
	 * Renvoie le lien de confirmation. Le message HTTP reste le même que le
	 * compte existe ou non. Un nouvel envoi n'a lieu que pour un compte non
	 * confirmé, et pas avant {@link #VERIFICATION_RESEND_COOLDOWN}.
	 */
	@Transactional
	public ResendOutcome resendVerification(ForgotPasswordRequest request, String ip) {
		if (rateLimiter.isRateLimited("resend_verification", ip, 5, Duration.ofHours(1))) {
			throw new AppException("rate_limited", "Trop de tentatives, réessayez plus tard.", HttpStatus.TOO_MANY_REQUESTS);
		}

		String email = normalizeEmail(request.email());
		User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
		if (user == null
				|| user.isEmailVerified()
				|| user.isAccountDeleted()
				|| user.isAccountDeactivated()) {
			return ResendOutcome.silent();
		}

		int wait = secondsUntilResendAllowed(user);
		if (wait > 0) {
			return new ResendOutcome(wait, null);
		}

		String verificationUrl = issueVerificationEmail(user);
		return new ResendOutcome(VERIFICATION_RESEND_COOLDOWN_SECONDS, verificationUrl);
	}

	private String issueVerificationEmail(User user) {
		String rawToken = TokenHasher.generateRawToken(32);
		user.setEmailVerificationTokenHash(TokenHasher.sha256(rawToken));
		Instant now = Instant.now();
		user.setEmailVerificationExpiresAt(now.plus(1, ChronoUnit.DAYS));
		user.setEmailVerificationSentAt(now);
		return authEmailService.sendVerificationEmail(user.getEmail(), rawToken);
	}

	private static int secondsUntilResendAllowed(User user) {
		Instant sentAt = user.getEmailVerificationSentAt();
		if (sentAt == null && user.getEmailVerificationExpiresAt() != null) {
			sentAt = user.getEmailVerificationExpiresAt().minus(1, ChronoUnit.DAYS);
		}
		if (sentAt == null) {
			return 0;
		}
		Instant allowedAt = sentAt.plus(VERIFICATION_RESEND_COOLDOWN);
		if (!Instant.now().isBefore(allowedAt)) {
			return 0;
		}
		long seconds = Duration.between(Instant.now(), allowedAt).toSeconds();
		return (int) Math.max(1, seconds);
	}

	@Transactional
	public void verifyEmail(TokenRequest request) {
		String hash = TokenHasher.sha256(request.token());
		User user = userRepository.findByEmailVerificationTokenHash(hash)
				.orElseThrow(() -> new AppException(
						"invalid_token",
						"Lien de vérification invalide ou déjà utilisé.",
						HttpStatus.BAD_REQUEST));

		if (user.getEmailVerificationExpiresAt() == null
				|| user.getEmailVerificationExpiresAt().isBefore(Instant.now())) {
			throw new AppException(
					"expired_token",
					"Lien de vérification expiré, demandez-en un nouveau.",
					HttpStatus.BAD_REQUEST);
		}

		user.setEmailVerified(true);
		user.setEmailVerificationTokenHash(null);
		user.setEmailVerificationExpiresAt(null);
	}

	@Transactional
	public IssuedSession login(LoginRequest request, String ip, String userAgent) {
		String email = normalizeEmail(request.email());
		if (rateLimiter.isRateLimited("login_ip", ip, 20, Duration.ofMinutes(15))
				|| rateLimiter.isRateLimited("login_email", email, 5, Duration.ofMinutes(15))) {
			throw new AppException("rate_limited", "Trop de tentatives, réessayez plus tard.", HttpStatus.TOO_MANY_REQUESTS);
		}

		User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
		if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			throw new AppException(
					"invalid_credentials",
					"Email ou mot de passe incorrect.",
					HttpStatus.UNAUTHORIZED);
		}
		if (!user.isEmailVerified()) {
			throw new AppException(
					"email_not_verified",
					"Merci de vérifier votre email avant de vous connecter.",
					HttpStatus.FORBIDDEN);
		}
		if (user.isAccountDeactivated()) {
			throw new AppException(
					"account_deactivated",
					"Ce compte a été désactivé.",
					HttpStatus.FORBIDDEN);
		}
		// Pas de second facteur. La colonne two_factor_enabled reste en base
		// mais n'est pas lue ici : la connexion se fait avec le mot de passe.
		boolean rememberMe = request.rememberMe() != null && request.rememberMe();
		rateLimiter.reset("login_email", email);
		rateLimiter.reset("login_ip", ip);
		return issueSession(user, rememberMe, userAgent, ip, null);
	}

	@Transactional
	public IssuedSession refresh(String rawRefreshToken, String ip, String userAgent) {
		if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
			throw new AppException(
					"app_auth_missing_refresh",
					"Aucune session active.",
					HttpStatus.UNAUTHORIZED);
		}

		RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(rawRefreshToken);
		User user = userRepository.findById(rotation.userId())
				.orElseThrow(() -> new AppException(
						"app_auth_invalid_refresh",
						"Refresh token invalide.",
						HttpStatus.UNAUTHORIZED));

		if (user.isAccountDeactivated()) {
			refreshTokenService.revokeAllForUser(user.getId());
			throw new AppException(
					"account_deactivated",
					"Ce compte a été désactivé.",
					HttpStatus.FORBIDDEN);
		}

		return issueSession(user, rotation.rememberMe(), userAgent, ip, rotation.familyId());
	}

	@Transactional
	public void logout(String rawRefreshToken) {
		if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
			refreshTokenService.revoke(rawRefreshToken);
		}
	}

	@Transactional
	public void forgotPassword(ForgotPasswordRequest request, String ip) {
		if (rateLimiter.isRateLimited("forgot_password", ip, 5, Duration.ofHours(1))) {
			throw new AppException("rate_limited", "Trop de tentatives, réessayez plus tard.", HttpStatus.TOO_MANY_REQUESTS);
		}

		String email = normalizeEmail(request.email());
		userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
			String rawToken = TokenHasher.generateRawToken(32);
			user.setPasswordResetTokenHash(TokenHasher.sha256(rawToken));
			user.setPasswordResetExpiresAt(Instant.now().plus(1, ChronoUnit.HOURS));
			authEmailService.sendPasswordResetEmail(email, rawToken);
		});
	}

	@Transactional
	public void resetPassword(ResetPasswordRequest request) {
		List<String> passwordErrors = PasswordPolicy.errors(request.newPassword());
		if (!passwordErrors.isEmpty()) {
			throw validationFailed(Map.of("newPassword", passwordErrors));
		}

		String hash = TokenHasher.sha256(request.token());
		User user = userRepository.findByPasswordResetTokenHash(hash)
				.orElseThrow(() -> new AppException(
						"invalid_token",
						"Lien de réinitialisation invalide ou déjà utilisé.",
						HttpStatus.BAD_REQUEST));

		if (user.getPasswordResetExpiresAt() == null
				|| user.getPasswordResetExpiresAt().isBefore(Instant.now())) {
			throw new AppException(
					"expired_token",
					"Lien de réinitialisation expiré.",
					HttpStatus.BAD_REQUEST);
		}

		user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
		user.setPasswordResetTokenHash(null);
		user.setPasswordResetExpiresAt(null);
		refreshTokenService.revokeAllForUser(user.getId());
	}

	@Transactional(readOnly = true)
	public AuthUserResponse me(UUID userId) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new AppException("not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
		return toAuthUser(user);
	}

	public IssuedSession issueSession(
			User user,
			boolean rememberMe,
			String userAgent,
			String ip,
			UUID familyId) {
		String accessToken = jwtService.issueAccessToken(user.getId());
		String refreshRaw = refreshTokenService.issue(user.getId(), rememberMe, userAgent, ip, familyId);
		return new IssuedSession(
				new SessionResponse(accessToken, jwtService.accessTtlSeconds(), toAuthUser(user)),
				refreshRaw);
	}

	public static AuthUserResponse toAuthUser(User user) {
		return new AuthUserResponse(
				user.getId().toString(),
				user.getDisplayName(),
				user.getEmail(),
				user.isSiteAdmin());
	}

	private static String normalizeEmail(String email) {
		return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
	}

	private static AppException validationFailed(Map<String, Object> fields) {
		return new AppException(
				"validation_failed",
				"La requête contient des données invalides.",
				HttpStatus.UNPROCESSABLE_ENTITY,
				Map.of("fields", fields));
	}

	public record IssuedSession(SessionResponse body, String refreshTokenRaw) {
	}

	public record RegisterOutcome(boolean created, String verificationUrl) {
		static RegisterOutcome accountCreated(String verificationUrl) {
			return new RegisterOutcome(true, verificationUrl);
		}

		static RegisterOutcome emailAlreadyUsed() {
			return new RegisterOutcome(false, null);
		}
	}

	/**
	 * @param retryAfterSeconds délai avant le prochain envoi utile
	 * @param verificationUrl   lien, uniquement exposé au client en profil dev
	 */
	public record ResendOutcome(int retryAfterSeconds, String verificationUrl) {
		/** Même délai qu'un envoi réel, pour ne pas révéler si le compte existe. */
		static ResendOutcome silent() {
			return new ResendOutcome(VERIFICATION_RESEND_COOLDOWN_SECONDS, null);
		}
	}
}
