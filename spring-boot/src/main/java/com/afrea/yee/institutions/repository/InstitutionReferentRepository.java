package com.afrea.yee.institutions.repository;

import com.afrea.yee.institutions.entity.InstitutionReferent;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InstitutionReferentRepository extends JpaRepository<InstitutionReferent, Long> {

	boolean existsByUserId(UUID userId);

	boolean existsByInstitutionIdAndUserId(UUID institutionId, UUID userId);

	long countByInstitutionId(UUID institutionId);

	Optional<InstitutionReferent> findByInstitutionIdAndUserId(UUID institutionId, UUID userId);

	@Query("""
			SELECT r.user.id FROM InstitutionReferent r
			WHERE r.institution.id = :institutionId
			""")
	List<UUID> findDirectReferentUserIds(@Param("institutionId") UUID institutionId);

	@Query("""
			SELECT r FROM InstitutionReferent r
			WHERE r.user.id = :userId AND r.institution.id IN :institutionIds
			""")
	List<InstitutionReferent> findByUserAndInstitutions(
			@Param("userId") UUID userId,
			@Param("institutionIds") Collection<UUID> institutionIds);
}
