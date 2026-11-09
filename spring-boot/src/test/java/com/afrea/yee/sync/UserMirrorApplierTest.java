package com.afrea.yee.sync;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.UserAccountStatus;
import com.afrea.yee.auth.entity.User;
import com.afrea.yee.users.UserTransformer;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserMirrorApplierTest {

	@Mock
	UserTransformer userTransformer;

	UserMirrorApplier applier;

	@BeforeEach
	void setUp() {
		applier = new UserMirrorApplier(userTransformer);
	}

	@Test
	void applySyncedFieldsOverwritesMirrorColumnsOnly() {
		when(userTransformer.writeSocialLinks(anyMap())).thenReturn("{\"linkedin\":\"https://linkedin.com/in/a\"}");

		User user = new User();
		user.setEmail("old@example.org");
		user.setDisplayName("Old");
		user.setPasswordHash("$2a$hashed");
		user.setStatus(UserAccountStatus.ACTIF);
		user.setSiteAdmin(true);
		user.setBio("old bio");

		Map<String, String> social = new HashMap<>();
		social.put("linkedin", "https://linkedin.com/in/a");
		social.put("twitter", null);
		social.put("website", null);

		SyncedUserFields fields = new SyncedUserFields(
				"Amina@Example.ORG",
				"Amina Example",
				"Evaluator",
				"Public health",
				"Ghana",
				"Example VOPE",
				social,
				"https://afrea.org/photo.jpg",
				null,
				"English, French",
				MembershipType.INDIVIDUAL,
				LocalDate.of(2027, 11, 1),
				false);

		Instant syncedAt = Instant.parse("2026-11-09T02:00:00Z");
		applier.applySyncedFields(user, fields, syncedAt);

		assertThat(user.getEmail()).isEqualTo("amina@example.org");
		assertThat(user.getDisplayName()).isEqualTo("Amina Example");
		assertThat(user.getBio()).isEqualTo("Evaluator");
		assertThat(user.getProfession()).isEqualTo("Public health");
		assertThat(user.getLocation()).isEqualTo("Ghana");
		assertThat(user.getOrganization()).isEqualTo("Example VOPE");
		assertThat(user.getAvatarUrl()).isEqualTo("https://afrea.org/photo.jpg");
		assertThat(user.getCoverUrl()).isNull();
		assertThat(user.getLanguages()).isEqualTo("English, French");
		assertThat(user.getMembershipType()).isEqualTo(MembershipType.INDIVIDUAL);
		assertThat(user.getMembershipExpiresOn()).isEqualTo(LocalDate.of(2027, 11, 1));
		assertThat(user.isMembershipYee()).isFalse();
		assertThat(user.getLastSyncedAt()).isEqualTo(syncedAt);

		// Colonnes locales intactes
		assertThat(user.getPasswordHash()).isEqualTo("$2a$hashed");
		assertThat(user.getStatus()).isEqualTo(UserAccountStatus.ACTIF);
		assertThat(user.isSiteAdmin()).isTrue();

		verify(userTransformer).writeSocialLinks(anyMap());
	}

	@Test
	void rejectsUnknownMembershipType() {
		User user = new User();
		SyncedUserFields fields = new SyncedUserFields(
				"a@example.org",
				"A",
				null,
				null,
				null,
				null,
				Map.of(),
				null,
				null,
				null,
				"unknown_type",
				null,
				null);

		assertThatThrownBy(() -> applier.applySyncedFields(user, fields, Instant.now()))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("membership.type");
	}
}
