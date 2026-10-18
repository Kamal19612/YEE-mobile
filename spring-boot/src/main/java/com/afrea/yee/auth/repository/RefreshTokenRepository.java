package com.afrea.yee.auth.repository;

import com.afrea.yee.auth.entity.RefreshToken;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

	Optional<RefreshToken> findByTokenHash(String tokenHash);

	@Query("""
			SELECT t FROM RefreshToken t
			WHERE t.user.id = :userId
			  AND t.revokedAt IS NULL
			  AND t.usedAt IS NULL
			  AND t.expiresAt > CURRENT_TIMESTAMP
			ORDER BY t.createdAt DESC
			""")
	List<RefreshToken> findActiveSessions(@Param("userId") UUID userId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
			UPDATE RefreshToken t
			SET t.revokedAt = CURRENT_TIMESTAMP
			WHERE t.user.id = :userId AND t.revokedAt IS NULL AND t.usedAt IS NULL
			""")
	int revokeAllActiveForUser(@Param("userId") UUID userId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
			DELETE FROM RefreshToken t
			WHERE t.expiresAt < :cutoff
			   OR (t.usedAt IS NOT NULL AND t.usedAt < :cutoff)
			   OR (t.revokedAt IS NOT NULL AND t.revokedAt < :cutoff)
			""")
	int deleteStale(@Param("cutoff") Instant cutoff);
}
