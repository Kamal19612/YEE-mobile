package com.afrea.yee.institutions;

import java.util.UUID;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Primary
@Component
public class DefaultInstitutionAuthorityChecker implements InstitutionAuthorityChecker {

	private final InstitutionPermissions permissions;

	public DefaultInstitutionAuthorityChecker(InstitutionPermissions permissions) {
		this.permissions = permissions;
	}

	@Override
	public boolean isReferentOfAny(UUID userId) {
		return permissions.isSiteAdmin(userId) || permissions.isReferentOfAny(userId);
	}
}
