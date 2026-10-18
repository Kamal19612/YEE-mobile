package com.afrea.yee.users.dto;

public record ChangePasswordRequest(String currentPassword, String newPassword) {
}
