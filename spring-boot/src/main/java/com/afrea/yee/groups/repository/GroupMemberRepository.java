package com.afrea.yee.groups.repository;

import com.afrea.yee.groups.entity.GroupMember;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

	Optional<GroupMember> findByGroupIdAndUserId(UUID groupId, UUID userId);

	@Query("""
			SELECT m FROM GroupMember m
			JOIN FETCH m.user
			WHERE m.group.id = :groupId
			  AND (:status IS NULL OR m.status = :status)
			  AND m.user.accountDeleted = false
			ORDER BY m.createdAt DESC
			""")
	List<GroupMember> findByGroupAndOptionalStatus(
			@Param("groupId") UUID groupId,
			@Param("status") String status);

	@Query("""
			SELECT m FROM GroupMember m
			JOIN FETCH m.group
			WHERE m.user.id = :userId AND m.group.id IN :groupIds
			""")
	List<GroupMember> findViewerMemberships(
			@Param("userId") UUID userId,
			@Param("groupIds") Collection<UUID> groupIds);

	@Query("""
			SELECT m.group.id FROM GroupMember m
			WHERE m.user.id = :userId
			  AND m.status IN ('active', 'pending', 'invited')
			""")
	List<UUID> findGroupIdsVisibleToUser(@Param("userId") UUID userId);

	@Query("""
			SELECT m.group.id FROM GroupMember m
			WHERE m.user.id = :userId AND m.status = 'active'
			""")
	List<UUID> findActiveGroupIdsForUser(@Param("userId") UUID userId);

	@Query("""
			SELECT m FROM GroupMember m
			JOIN FETCH m.group
			WHERE m.user.id = :userId
			  AND m.status = 'active'
			  AND m.group.deletedAt IS NULL
			ORDER BY m.group.createdAt DESC
			""")
	List<GroupMember> findActiveMembershipsWithGroup(@Param("userId") UUID userId);

	@Query("""
			SELECT m FROM GroupMember m
			JOIN FETCH m.group
			WHERE m.user.id = :userId
			  AND m.status = 'invited'
			  AND m.group.deletedAt IS NULL
			ORDER BY m.createdAt DESC
			""")
	List<GroupMember> findPendingInvitationsWithGroup(@Param("userId") UUID userId);

	@Query("""
			SELECT m.user.id FROM GroupMember m
			WHERE m.group.id = :groupId
			  AND m.status = 'active'
			  AND m.role IN ('admin', 'moderator')
			""")
	List<UUID> findActiveModeratorAdminIds(@Param("groupId") UUID groupId);

	@Query("""
			SELECT COUNT(m) FROM GroupMember m
			WHERE m.group.id = :groupId AND m.status = 'active' AND m.role = 'admin'
			""")
	long countActiveAdmins(@Param("groupId") UUID groupId);

	boolean existsByGroupIdAndUserIdAndStatus(UUID groupId, UUID userId, String status);

	@Query("""
			SELECT m FROM GroupMember m
			JOIN FETCH m.group
			WHERE m.user.id = :userId
			  AND m.createdAt < :before
			ORDER BY m.createdAt DESC
			""")
	List<GroupMember> findByUserForAdmin(
			@Param("userId") UUID userId,
			@Param("before") Instant before,
			Pageable pageable);
}
