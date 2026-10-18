package com.afrea.yee.notifications.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PushSubscribeRequest(
		@NotBlank String endpoint,
		@NotNull @Valid Keys keys,
		String userAgent) {

	public record Keys(@NotBlank String p256dh, @NotBlank String auth) {}
}
