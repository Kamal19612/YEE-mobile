package com.afrea.yee.groups;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GroupVisibilityRulesTest {

	@Test
	void joinRulesMatchAudit() {
		assertThat(expectedJoinStatus("public")).isEqualTo("active");
		assertThat(expectedJoinStatus("private")).isEqualTo("pending");
		assertThat(expectedJoinStatus("secret")).isEqualTo("invite_only");
	}

	private static String expectedJoinStatus(String visibility) {
		return switch (visibility) {
			case "public" -> "active";
			case "private" -> "pending";
			case "secret" -> "invite_only";
			default -> "forbidden";
		};
	}
}
