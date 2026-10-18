package com.afrea.yee.events.repository;

import com.afrea.yee.events.entity.Event;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, UUID> {

	boolean existsBySlug(String slug);

	long countByCategoryId(UUID categoryId);

	@Query("""
			SELECT e FROM Event e
			JOIN FETCH e.category
			LEFT JOIN FETCH e.createdBy
			WHERE e.status = :status
			  AND (:categoryId IS NULL OR e.category.id = :categoryId)
			  AND (
			    :temporal IS NULL OR :temporal = ''
			    OR (:temporal = 'upcoming' AND e.endsAt >= :now)
			    OR (:temporal = 'past' AND e.endsAt < :now)
			  )
			  AND (
			    :search IS NULL OR :search = ''
			    OR LOWER(e.title) LIKE LOWER(CONCAT('%', :search, '%'))
			    OR LOWER(e.description) LIKE LOWER(CONCAT('%', :search, '%'))
			  )
			ORDER BY e.startsAt DESC
			""")
	List<Event> searchPublished(
			@Param("status") String status,
			@Param("categoryId") UUID categoryId,
			@Param("temporal") String temporal,
			@Param("now") Instant now,
			@Param("search") String search);

	@Query("""
			SELECT e FROM Event e
			JOIN FETCH e.category
			LEFT JOIN FETCH e.createdBy
			WHERE e.id = :id
			""")
	Optional<Event> findWithAuthor(@Param("id") UUID id);
}
