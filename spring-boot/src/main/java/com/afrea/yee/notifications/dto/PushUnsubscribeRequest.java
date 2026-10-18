package com.afrea.yee.notifications.dto;

import jakarta.validation.constraints.NotBlank;

public record PushUnsubscribeRequest(@NotBlank String endpoint) {}
