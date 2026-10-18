package com.afrea.yee.institutions;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.institutions.entity.Institution;
import com.afrea.yee.institutions.repository.InstitutionReferentRepository;
import com.afrea.yee.institutions.repository.InstitutionRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class InstitutionPermissions {

	private final InstitutionRepository institutionRepository;
	private final InstitutionReferentRepository referentRepository;
	private final UserRepository userRepository;

	public InstitutionPermissions(
			InstitutionRepository institutionRepository,
			InstitutionReferentRepository referentRepository,
			UserRepository userRepository) {
		this.institutionRepository = institutionRepository;
		this.referentRepository = referentRepository;
		this.userRepository = userRepository;
	}

	public boolean isSiteAdmin(UUID userId) {
		if (userId == null) {
			return false;
		}
		return userRepository.findById(userId).map(User::isSiteAdmin).orElse(false);
	}

	public boolean isReferentOfAny(UUID userId) {
		return userId != null && referentRepository.existsByUserId(userId);
	}

	public boolean isReferentWithCascade(UUID institutionId, UUID userId) {
		if (userId == null || institutionId == null) {
			return false;
		}
		if (isSiteAdmin(userId)) {
			return true;
		}
		return institutionRepository.countReferentOnAncestors(institutionId, userId) > 0;
	}

	public boolean isDirectReferent(UUID institutionId, UUID userId) {
		return userId != null && referentRepository.existsByInstitutionIdAndUserId(institutionId, userId);
	}

	public void requireManage(Institution institution, UUID actorId) {
		if (!isReferentWithCascade(institution.getId(), actorId)) {
			throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		}
	}

	public void requireCreateChild(Institution parent, UUID actorId) {
		requireManage(parent, actorId);
	}

	public void requireCreateContinent(UUID actorId) {
		if (!isSiteAdmin(actorId)) {
			throw new AppException("forbidden", "Access denied", HttpStatus.FORBIDDEN);
		}
	}
}
