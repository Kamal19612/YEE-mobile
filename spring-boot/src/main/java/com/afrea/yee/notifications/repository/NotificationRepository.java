package com.afrea.yee.notifications.repository;

import com.afrea.yee.notifications.entity.Notification;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

	@Query("""
			SELECT n FROM Notification n
			WHERE n.userId = :userId AND n.type <> 'new_message'
			ORDER BY n.createdAt DESC
			""")
	Page<Notification> findByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId, Pageable pageable);

	@Query("""
			SELECT n FROM Notification n
			WHERE n.userId = :userId AND n.read = false AND n.type <> 'new_message'
			ORDER BY n.createdAt DESC
			""")
	Page<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(
			@Param("userId") UUID userId, Pageable pageable);

	@Query("""
			SELECT COUNT(n) FROM Notification n
			WHERE n.userId = :userId AND n.read = false AND n.type <> 'new_message'
			""")
	long countByUserIdAndReadFalse(@Param("userId") UUID userId);

	Optional<Notification> findByIdAndUserId(Long id, UUID userId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
			UPDATE Notification n
			SET n.read = true
			WHERE n.userId = :userId AND n.read = false
			""")
	int markAllRead(@Param("userId") UUID userId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
			DELETE FROM Notification n
			WHERE n.read = true AND n.createdAt < :cutoff
			""")
	int deleteReadOlderThan(@Param("cutoff") Instant cutoff);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
			DELETE FROM Notification n
			WHERE n.createdAt < :cutoff
			""")
	int deleteOlderThan(@Param("cutoff") Instant cutoff);
}
