package com.afrea.yee.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
		@NotBlank @Email String email,
		@NotBlank String password,
		Boolean rememberMe
) {
}
