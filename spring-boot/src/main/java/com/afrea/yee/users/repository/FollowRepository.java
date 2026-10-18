package com.afrea.yee.users.repository;

import com.afrea.yee.users.entity.Follow;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FollowRepository extends JpaRepository<Follow, Long> {

	boolean existsByFollowerIdAndFolloweeId(UUID followerId, UUID followeeId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			INSERT INTO follows (follower_id, followee_id, created_at)
			VALUES (:followerId, :followeeId, NOW())
			ON CONFLICT (follower_id, followee_id) DO NOTHING
			""", nativeQuery = true)
	int insertIgnore(@Param("followerId") UUID followerId, @Param("followeeId") UUID followeeId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
			DELETE FROM Follow f
			WHERE f.follower.id = :followerId AND f.followee.id = :followeeId
			""")
	int deleteByFollowerAndFollowee(@Param("followerId") UUID followerId, @Param("followeeId") UUID followeeId);

	@Query("""
			SELECT f.follower.id FROM Follow f
			WHERE f.followee.id = :userId
			ORDER BY f.createdAt DESC
			""")
	List<UUID> findFollowerIds(@Param("userId") UUID userId, Pageable pageable);

	@Query("""
			SELECT f.followee.id FROM Follow f
			WHERE f.follower.id = :userId
			ORDER BY f.createdAt DESC
			""")
	List<UUID> findFolloweeIds(@Param("userId") UUID userId, Pageable pageable);

	@Query("""
			SELECT f.followee.id FROM Follow f
			WHERE f.follower.id = :viewerId
			  AND f.followee.id IN :ids
			""")
	List<UUID> findFolloweeIdsIn(
			@Param("viewerId") UUID viewerId,
			@Param("ids") Collection<UUID> ids);

	@Query("""
			SELECT f FROM Follow f
			JOIN FETCH f.followee
			WHERE f.follower.id = :userId
			  AND f.createdAt < :before
			ORDER BY f.createdAt DESC
			""")
	List<Follow> findByFollowerForAdmin(
			@Param("userId") UUID userId,
			@Param("before") Instant before,
			Pageable pageable);
}
