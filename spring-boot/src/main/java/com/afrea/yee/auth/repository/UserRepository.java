package com.afrea.yee.auth.repository;

import com.afrea.yee.auth.entity.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

	Optional<User> findByEmailIgnoreCase(String email);

	boolean existsByEmailIgnoreCase(String email);

	Optional<User> findByEmailVerificationTokenHash(String tokenHash);

	Optional<User> findByPasswordResetTokenHash(String tokenHash);

	List<User> findByAccountDeletedTrue();

	@Query("""
			SELECT u FROM User u
			WHERE u.accountDeactivated = false
			  AND u.accountDeleted = false
			  AND LOWER(u.displayName) LIKE LOWER(CONCAT('%', :q, '%'))
			ORDER BY u.displayName ASC
			""")
	List<User> searchByDisplayName(@Param("q") String q, Pageable pageable);

	@Query("""
			SELECT u FROM User u
			WHERE u.accountDeactivated = false
			  AND u.accountDeleted = false
			  AND LOWER(u.email) = LOWER(:email)
			""")
	Optional<User> findActiveByExactEmail(@Param("email") String email);

	@Query("""
			SELECT u FROM User u
			WHERE u.accountDeactivated = false
			  AND u.accountDeleted = false
			  AND (
			    :search IS NULL OR :search = '' OR
			    LOWER(u.displayName) LIKE LOWER(CONCAT('%', :search, '%'))
			  )
			ORDER BY u.displayName ASC
			""")
	Page<User> directory(@Param("search") String search, Pageable pageable);

	/** Même filtre que l'annuaire : comptes ni désactivés ni supprimés. */
	@Query("""
			SELECT COUNT(u) FROM User u
			WHERE u.accountDeactivated = false
			  AND u.accountDeleted = false
			""")
	long countDirectory();

	@Query("""
			SELECT u FROM User u
			WHERE (
			    :status = 'all'
			    OR (:status = 'active' AND u.accountDeactivated = false AND u.emailVerified = true)
			    OR (:status = 'unverified' AND u.accountDeactivated = false AND u.emailVerified = false)
			    OR (:status = 'deactivated' AND u.accountDeactivated = true)
			    OR (:status = 'admins' AND u.siteAdmin = true)
			  )
			  AND u.accountDeleted = false
			  AND (
			    :q IS NULL OR :q = ''
			    OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :q, '%'))
			    OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
			    OR LOWER(COALESCE(u.mentionName, '')) LIKE LOWER(CONCAT('%', :q, '%'))
			  )
			ORDER BY u.createdAt DESC
			""")
	Page<User> adminSearch(@Param("q") String q, @Param("status") String status, Pageable pageable);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			UPDATE users
			SET following_count = following_count + :delta
			WHERE id = :userId
			""", nativeQuery = true)
	int bumpFollowing(@Param("userId") UUID userId, @Param("delta") int delta);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			UPDATE users
			SET followers_count = followers_count + :delta
			WHERE id = :userId
			""", nativeQuery = true)
	int bumpFollowers(@Param("userId") UUID userId, @Param("delta") int delta);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			UPDATE users
			SET following_count = GREATEST(0, following_count + :delta)
			WHERE id = :userId
			""", nativeQuery = true)
	int adjustFollowing(@Param("userId") UUID userId, @Param("delta") int delta);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			UPDATE users
			SET followers_count = GREATEST(0, followers_count + :delta)
			WHERE id = :userId
			""", nativeQuery = true)
	int adjustFollowers(@Param("userId") UUID userId, @Param("delta") int delta);
}
