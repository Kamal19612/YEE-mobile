package com.afrea.yee.admin.dto;

public record AdminAccountPatchRequest(
		Boolean accountDeactivated,
		Boolean siteAdmin,
		Boolean emailVerified) {
}
