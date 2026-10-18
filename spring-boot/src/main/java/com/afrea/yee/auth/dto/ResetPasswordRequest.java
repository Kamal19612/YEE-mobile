package com.afrea.yee.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ResetPasswordRequest(
		@NotBlank String token,
		@NotBlank String newPassword
) {
}
