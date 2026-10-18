package com.afrea.yee.users;

import com.afrea.yee.auth.PasswordPolicy;
import com.afrea.yee.auth.RefreshTokenService;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.conversations.ConversationPermissions;
import com.afrea.yee.media.ImageUploadValidator;
import com.afrea.yee.media.ObjectStorage;
import com.afrea.yee.media.StoredObject;
import com.afrea.yee.users.dto.ChangePasswordRequest;
import com.afrea.yee.users.dto.DeleteAccountRequest;
import com.afrea.yee.users.dto.PublicProfileResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

@Service
public class ProfileService {

	private static final List<String> SOCIAL_KEYS = List.of("linkedin", "twitter", "website");

	private final UserRepository userRepository;
	private final UserTransformer userTransformer;
	private final FollowService followService;
	private final PasswordEncoder passwordEncoder;
	private final RefreshTokenService refreshTokenService;
	private final ImageUploadValidator imageUploadValidator;
	private final ObjectStorage objectStorage;
	private final AccountDeletionService accountDeletionService;
	private final ConversationPermissions conversationPermissions;
	private final ApplicationEventPublisher events;

	public ProfileService(
			UserRepository userRepository,
			UserTransformer userTransformer,
			FollowService followService,
			PasswordEncoder passwordEncoder,
			RefreshTokenService refreshTokenService,
			ImageUploadValidator imageUploadValidator,
			ObjectStorage objectStorage,
			AccountDeletionService accountDeletionService,
			ConversationPermissions conversationPermissions,
			ApplicationEventPublisher events) {
		this.userRepository = userRepository;
		this.userTransformer = userTransformer;
		this.followService = followService;
		this.passwordEncoder = passwordEncoder;
		this.refreshTokenService = refreshTokenService;
		this.imageUploadValidator = imageUploadValidator;
		this.objectStorage = objectStorage;
		this.accountDeletionService = accountDeletionService;
		this.conversationPermissions = conversationPermissions;
		this.events = events;
	}

	@Transactional(readOnly = true)
	public PublicProfileResponse getMe(UUID userId) {
		User user = requireUser(userId);
		return userTransformer.toPublicProfile(user, true, false);
	}

	@Transactional(readOnly = true)
	public PublicProfileResponse getPublic(UUID userId, UUID viewerId) {
		User user = requireActiveUser(userId);
		boolean isSelf = viewerId != null && viewerId.equals(userId);
		boolean isFollowing = !isSelf && viewerId != null && followService.isFollowing(viewerId, userId);
		Boolean canMessage = isSelf || viewerId == null
				? null
				: conversationPermissions.canMessage(viewerId, user);
		return userTransformer.toPublicProfile(user, isSelf, isFollowing, canMessage);
	}

	@Transactional
	public PublicProfileResponse patchMe(UUID userId, JsonNode body) {
		User user = requireUser(userId);
		Map<String, Object> errors = new LinkedHashMap<>();

		if (body.has("displayName")) {
			String displayName = cleanText(body.get("displayName").asString(""));
			if (displayName.length() < 2 || displayName.length() > 60) {
				errors.put("displayName", "Le nom doit contenir entre 2 et 60 caractères.");
			} else {
				user.setDisplayName(displayName);
			}
		}

		applyTextField(body, "bio", 500, errors, user::setBio);
		applyTextField(body, "profession", 120, errors, user::setProfession);
		applyTextField(body, "organization", 120, errors, user::setOrganization);
		applyTextField(body, "location", 120, errors, user::setLocation);

		if (body.has("whoCanMessage") && !body.get("whoCanMessage").isNull()) {
			String policy = conversationPermissions.normalizeWhoCanMessage(body.get("whoCanMessage").asString(""));
			if (!policy.equals(body.get("whoCanMessage").asString("").trim().toLowerCase(Locale.ROOT))
					&& !body.get("whoCanMessage").asString("").isBlank()) {
				errors.put("whoCanMessage", "Valeur invalide (everyone, friends, nobody).");
			} else {
				user.setWhoCanMessage(policy);
			}
		}

		if (body.has("emailPrefMessages") && !body.get("emailPrefMessages").isNull()) {
			JsonNode pref = body.get("emailPrefMessages");
			user.setEmailPrefMessages(pref.isBoolean() ? pref.booleanValue() : Boolean.parseBoolean(pref.asString("true")));
		}

		if (body.has("socialLinks")) {
			JsonNode socialNode = body.get("socialLinks");
			if (!socialNode.isObject()) {
				errors.put("socialLinks", "Les liens doivent être un objet.");
			} else {
				Map<String, String> social = new LinkedHashMap<>();
				for (String key : SOCIAL_KEYS) {
					if (!socialNode.has(key) || socialNode.get(key).isNull()) {
						continue;
					}
					String url = socialNode.get(key).asString("").trim();
					if (url.isEmpty()) {
						continue;
					}
					if (!url.toLowerCase(Locale.ROOT).startsWith("https://")) {
						errors.put("socialLinks", "Les liens doivent être des URL https:// valides.");
						break;
					}
					social.put(key, url);
				}
				if (!errors.containsKey("socialLinks")) {
					user.setSocialLinksJson(userTransformer.writeSocialLinks(social));
				}
			}
		}

		if (!errors.isEmpty()) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", errors));
		}

		events.publishEvent(VisibleDataChanged.members());
		return userTransformer.toPublicProfile(user, true, false);
	}

	@Transactional
	public Map<String, String> changePassword(UUID userId, ChangePasswordRequest request) {
		User user = requireUser(userId);
		String current = request.currentPassword() == null ? "" : request.currentPassword();
		String next = request.newPassword() == null ? "" : request.newPassword();

		if (!passwordEncoder.matches(current, user.getPasswordHash())) {
			throw new AppException(
					"invalid_current_password",
					"Mot de passe actuel incorrect.",
					HttpStatus.UNAUTHORIZED);
		}

		List<String> passwordErrors = PasswordPolicy.errors(next);
		if (!passwordErrors.isEmpty()) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("newPassword", passwordErrors)));
		}

		user.setPasswordHash(passwordEncoder.encode(next));
		refreshTokenService.revokeAllForUser(userId);
		return Map.of("message", "Mot de passe modifié. Merci de vous reconnecter.");
	}

	@Transactional
	public Map<String, String> uploadAvatar(UUID userId, MultipartFile file) {
		return uploadImage(userId, file, "avatars", true);
	}

	@Transactional
	public Map<String, String> uploadCover(UUID userId, MultipartFile file) {
		return uploadImage(userId, file, "covers", false);
	}

	@Transactional
	public Map<String, String> deleteAccount(UUID userId, DeleteAccountRequest request) {
		User user = requireUser(userId);
		String password = request.password() == null ? "" : request.password();
		if (!passwordEncoder.matches(password, user.getPasswordHash())) {
			throw new AppException("invalid_password", "Mot de passe incorrect.", HttpStatus.UNAUTHORIZED);
		}
		if (user.isSiteAdmin()) {
			throw new AppException(
					"admin_cannot_delete_self",
					"Un administrateur ne peut pas supprimer son propre compte ici.",
					HttpStatus.UNPROCESSABLE_ENTITY);
		}
		if (user.isAccountDeleted()) {
			throw new AppException("account_already_deleted", "Ce compte est déjà supprimé.", HttpStatus.UNPROCESSABLE_ENTITY);
		}
		accountDeletionService.purge(user);
		return Map.of("message", "Compte supprimé.");
	}

	private Map<String, String> uploadImage(UUID userId, MultipartFile file, String bucket, boolean avatar) {
		User user = requireUser(userId);
		ImageUploadValidator.ValidatedImage validated = imageUploadValidator.validate(file);
		String objectPath = userId + "/" + UUID.randomUUID() + "." + validated.extension();
		StoredObject stored = objectStorage.upload(bucket, objectPath, validated.bytes(), validated.contentType());

		if (avatar) {
			if (user.getAvatarStoragePath() != null) {
				objectStorage.delete("avatars", user.getAvatarStoragePath());
			}
			user.setAvatarStoragePath(stored.path());
			user.setAvatarUrl(stored.publicUrl());
		} else {
			if (user.getCoverStoragePath() != null) {
				objectStorage.delete("covers", user.getCoverStoragePath());
			}
			user.setCoverStoragePath(stored.path());
			user.setCoverUrl(stored.publicUrl());
		}
		events.publishEvent(VisibleDataChanged.members());
		return Map.of("url", stored.publicUrl());
	}

	private void applyTextField(
			JsonNode body,
			String field,
			int maxLength,
			Map<String, Object> errors,
			java.util.function.Consumer<String> setter) {
		if (!body.has(field)) {
			return;
		}
		String value = cleanText(body.get(field).asString(""));
		if (value.length() > maxLength) {
			errors.put(field, "Ce champ ne doit pas dépasser " + maxLength + " caractères.");
			return;
		}
		setter.accept(value);
	}

	private static String cleanText(String value) {
		if (value == null) {
			return "";
		}
		return value.replaceAll("<[^>]*>", "").trim();
	}

	private User requireUser(UUID userId) {
		return userRepository.findById(userId)
				.orElseThrow(() -> new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND));
	}

	private User requireActiveUser(UUID userId) {
		User user = requireUser(userId);
		if (user.isAccountDeactivated() || user.isAccountDeleted()) {
			throw new AppException("user_not_found", "Utilisateur introuvable.", HttpStatus.NOT_FOUND);
		}
		return user;
	}
}
