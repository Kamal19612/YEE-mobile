package com.afrea.yee.institutions.repository;

import com.afrea.yee.institutions.entity.UserInstitution;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserInstitutionRepository extends JpaRepository<UserInstitution, Long> {

	Optional<UserInstitution> findByInstitutionIdAndUserId(UUID institutionId, UUID userId);

	@Query("""
			SELECT ui FROM UserInstitution ui
			JOIN FETCH ui.institution i
			LEFT JOIN FETCH i.parent
			WHERE ui.user.id = :userId
			  AND (:status IS NULL OR ui.status = :status)
			  AND i.deletedAt IS NULL
			ORDER BY i.name ASC
			""")
	List<UserInstitution> findByUserAndOptionalStatus(
			@Param("userId") UUID userId,
			@Param("status") String status);

	@Query("""
			SELECT ui FROM UserInstitution ui
			JOIN FETCH ui.user
			WHERE ui.institution.id = :institutionId
			  AND (:status IS NULL OR ui.status = :status)
			  AND ui.user.accountDeactivated = false
			  AND ui.user.accountDeleted = false
			ORDER BY ui.createdAt DESC
			""")
	List<UserInstitution> findByInstitutionAndOptionalStatus(
			@Param("institutionId") UUID institutionId,
			@Param("status") String status);

	@Query("""
			SELECT ui FROM UserInstitution ui
			WHERE ui.user.id = :userId AND ui.institution.id IN :institutionIds
			""")
	List<UserInstitution> findViewerAffiliations(
			@Param("userId") UUID userId,
			@Param("institutionIds") Collection<UUID> institutionIds);

	@Query("""
			SELECT DISTINCT ui.user.id FROM UserInstitution ui
			WHERE ui.institution.id IN :institutionIds AND ui.status = 'active'
			  AND ui.institution.deletedAt IS NULL
			  AND (:search IS NULL OR :search = '' OR LOWER(ui.user.displayName) LIKE LOWER(CONCAT('%', :search, '%')))
			  AND ui.user.accountDeactivated = false
			  AND ui.user.accountDeleted = false
			""")
	Page<UUID> findActiveMemberUserIdsIn(
			@Param("institutionIds") Collection<UUID> institutionIds,
			@Param("search") String search,
			Pageable pageable);

	@Query("""
			SELECT ui FROM UserInstitution ui
			JOIN FETCH ui.institution
			WHERE ui.user.id = :userId
			  AND ui.createdAt < :before
			ORDER BY ui.createdAt DESC
			""")
	List<UserInstitution> findByUserForAdmin(
			@Param("userId") UUID userId,
			@Param("before") Instant before,
			Pageable pageable);
}
