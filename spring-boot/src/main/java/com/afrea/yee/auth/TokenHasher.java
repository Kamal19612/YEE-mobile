package com.afrea.yee.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

public final class TokenHasher {

	private static final SecureRandom RANDOM = new SecureRandom();

	private TokenHasher() {
	}

	public static String generateRawToken(int bytes) {
		byte[] buf = new byte[bytes];
		RANDOM.nextBytes(buf);
		return HexFormat.of().formatHex(buf);
	}

	public static String sha256(String raw) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(hash);
		} catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException("SHA-256 not available", ex);
		}
	}
}
