package com.afrea.yee.institutions;

import java.util.UUID;

/**
 * Point d'extension Couche 5.
 * isReferentOfAny = droit de créer un groupe (audit §5.3).
 */
public interface InstitutionAuthorityChecker {
	boolean isReferentOfAny(UUID userId);
}
