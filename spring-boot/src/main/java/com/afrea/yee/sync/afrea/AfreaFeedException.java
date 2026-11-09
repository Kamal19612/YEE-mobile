package com.afrea.yee.sync.afrea;

/** Erreur d'appel au feed AfrEA (réseau, HTTP, JSON). */
public class AfreaFeedException extends RuntimeException {

	private final Integer statusCode;

	public AfreaFeedException(String message) {
		super(message);
		this.statusCode = null;
	}

	public AfreaFeedException(String message, Throwable cause) {
		super(message, cause);
		this.statusCode = null;
	}

	public AfreaFeedException(int statusCode, String message) {
		super(message);
		this.statusCode = statusCode;
	}

	public Integer getStatusCode() {
		return statusCode;
	}
}
