package com.afrea.yee.institutions;

import java.util.UUID;

public record InstitutionAffiliationResolvedEvent(UUID requesterId, UUID institutionId, boolean approved) {
}
