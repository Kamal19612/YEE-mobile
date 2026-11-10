package com.afrea.yee.admin.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record AdminCreateInstitutionsRequest(
		@NotEmpty List<UUID> institutionIds) {
}
