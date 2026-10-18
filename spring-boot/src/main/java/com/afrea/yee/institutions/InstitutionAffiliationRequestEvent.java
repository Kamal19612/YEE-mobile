package com.afrea.yee.institutions;

import java.util.UUID;

public record InstitutionAffiliationRequestEvent(UUID institutionId, UUID requesterId) {
}
