package com.afrea.yee.common.security;

import com.afrea.yee.auth.security.UserPrincipal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class CurrentUser {

	private CurrentUser() {
	}

	public static Optional<UserPrincipal> principal() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal)) {
			return Optional.empty();
		}
		return Optional.of(principal);
	}

	public static Optional<UUID> id() {
		return principal().map(UserPrincipal::getId);
	}

	public static UUID requireId() {
		return id().orElseThrow();
	}
}
