package com.afrea.yee.users;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.users.dto.PublicProfileResponse;
import com.afrea.yee.users.dto.UserListItemResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class UserTransformer {

	private final ObjectMapper objectMapper;

	public UserTransformer(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public PublicProfileResponse toPublicProfile(User user, boolean isSelf, boolean isFollowing) {
		return new PublicProfileResponse(
				user.getId().toString(),
				user.getDisplayName(),
				user.getMentionName() == null ? "" : user.getMentionName(),
				nullToEmpty(user.getBio()),
				nullToEmpty(user.getProfession()),
				nullToEmpty(user.getOrganization()),
				nullToEmpty(user.getLocation()),
				parseSocialLinks(user.getSocialLinksJson()),
				resolveAvatarUrl(user),
				user.getCoverUrl(),
				new PublicProfileResponse.ProfileStats(
						user.getFollowersCount(),
						user.getFollowingCount(),
						user.getPostsCount()),
				user.getCreatedAt() != null ? user.getCreatedAt().toString() : null,
				isFollowing,
				isSelf ? user.getEmail() : null,
				isSelf ? (user.getWhoCanMessage() == null ? "friends" : user.getWhoCanMessage()) : null,
				isSelf ? user.isEmailPrefMessages() : null,
				null);
	}

	public PublicProfileResponse toPublicProfile(User user, boolean isSelf, boolean isFollowing, Boolean canMessage) {
		return new PublicProfileResponse(
				user.getId().toString(),
				user.getDisplayName(),
				user.getMentionName() == null ? "" : user.getMentionName(),
				nullToEmpty(user.getBio()),
				nullToEmpty(user.getProfession()),
				nullToEmpty(user.getOrganization()),
				nullToEmpty(user.getLocation()),
				parseSocialLinks(user.getSocialLinksJson()),
				resolveAvatarUrl(user),
				user.getCoverUrl(),
				new PublicProfileResponse.ProfileStats(
						user.getFollowersCount(),
						user.getFollowingCount(),
						user.getPostsCount()),
				user.getCreatedAt() != null ? user.getCreatedAt().toString() : null,
				isFollowing,
				isSelf ? user.getEmail() : null,
				isSelf ? (user.getWhoCanMessage() == null ? "friends" : user.getWhoCanMessage()) : null,
				isSelf ? user.isEmailPrefMessages() : null,
				isSelf ? null : canMessage);
	}

	public UserListItemResponse toListItem(User user) {
		return toListItem(user, false);
	}

	public UserListItemResponse toListItem(User user, boolean isFollowing) {
		return new UserListItemResponse(
				user.getId().toString(),
				user.getDisplayName(),
				nullToEmpty(user.getMentionName()),
				resolveAvatarUrl(user),
				nullToEmpty(user.getProfession()),
				nullToEmpty(user.getOrganization()),
				nullToEmpty(user.getLocation()),
				isFollowing);
	}

	public String resolveAvatarUrl(User user) {
		if (user.getAvatarUrl() != null && !user.getAvatarUrl().isBlank()) {
			return user.getAvatarUrl();
		}
		return gravatarUrl(user.getEmail(), 300);
	}

	public static String slugifyMention(String displayName, UUID userId) {
		String base = displayName == null ? "user" : displayName.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("^-+|-+$", "");
		if (base.isBlank()) {
			base = "user";
		}
		String suffix = userId.toString().replace("-", "").substring(0, 6);
		return base + "-" + suffix;
	}

	public String writeSocialLinks(Map<String, String> links) {
		try {
			return objectMapper.writeValueAsString(links == null ? Map.of() : links);
		} catch (RuntimeException ex) {
			return "{}";
		}
	}

	private Map<String, String> parseSocialLinks(String json) {
		if (json == null || json.isBlank()) {
			return Map.of();
		}
		try {
			JsonNode node = objectMapper.readTree(json);
			Map<String, String> map = new LinkedHashMap<>();
			if (node != null && node.isObject()) {
				node.properties().forEach(entry -> {
					if (entry.getValue() != null && entry.getValue().isString()) {
						map.put(entry.getKey(), entry.getValue().asString());
					}
				});
			}
			return map;
		} catch (RuntimeException ex) {
			return Map.of();
		}
	}

	private static String gravatarUrl(String email, int size) {
		String normalized = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
		String hash = md5Hex(normalized);
		return "https://www.gravatar.com/avatar/" + hash + "?d=mp&s=" + size;
	}

	private static String md5Hex(String value) {
		try {
			MessageDigest md = MessageDigest.getInstance("MD5");
			byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		} catch (NoSuchAlgorithmException ex) {
			return "00000000000000000000000000000000";
		}
	}

	private static String nullToEmpty(String value) {
		return value == null ? "" : value;
	}
}
