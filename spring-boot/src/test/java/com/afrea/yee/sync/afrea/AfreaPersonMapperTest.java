package com.afrea.yee.sync.afrea;

import static org.assertj.core.api.Assertions.assertThat;

import com.afrea.yee.sync.MembershipType;
import com.afrea.yee.sync.SyncedUserFields;
import com.afrea.yee.sync.afrea.dto.AfreaMembershipDto;
import com.afrea.yee.sync.afrea.dto.AfreaPersonDto;
import com.afrea.yee.sync.afrea.dto.AfreaSocialLinksDto;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class AfreaPersonMapperTest {

	private final AfreaPersonMapper mapper = new AfreaPersonMapper();

	@Test
	void mapsPeopleFieldsToSyncedUserFields() {
		AfreaPersonDto person = new AfreaPersonDto(
				"1001",
				"amina@example.org",
				"Amina Example",
				"Evaluator with ten years in public health.",
				"Public health evaluation",
				"Ghana",
				"Example Evaluation Association",
				new AfreaSocialLinksDto("https://linkedin.com/in/amina", null, null),
				"https://afrea.org/wp-content/uploads/member-photos/1001.jpg",
				null,
				"English, French",
				new AfreaMembershipDto(MembershipType.INDIVIDUAL, LocalDate.of(2027, 11, 1), false),
				Instant.parse("2026-10-27T14:05:00Z"));

		SyncedUserFields fields = mapper.toSyncedFields(person);

		assertThat(fields.email()).isEqualTo("amina@example.org");
		assertThat(fields.displayName()).isEqualTo("Amina Example");
		assertThat(fields.languages()).isEqualTo("English, French");
		assertThat(fields.membershipType()).isEqualTo(MembershipType.INDIVIDUAL);
		assertThat(fields.membershipExpiresOn()).isEqualTo(LocalDate.of(2027, 11, 1));
		assertThat(fields.membershipYee()).isFalse();
		assertThat(fields.coverUrl()).isNull();
		assertThat(fields.socialLinks()).containsEntry("linkedin", "https://linkedin.com/in/amina");
		assertThat(fields.socialLinks()).doesNotContainKey("twitter");
	}
}
