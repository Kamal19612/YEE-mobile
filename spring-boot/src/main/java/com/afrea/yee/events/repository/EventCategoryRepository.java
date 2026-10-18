package com.afrea.yee.events.repository;

import com.afrea.yee.events.entity.EventCategory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EventCategoryRepository extends JpaRepository<EventCategory, UUID> {

	boolean existsBySlug(String slug);

	Optional<EventCategory> findBySlug(String slug);

	@Query("""
			SELECT c FROM EventCategory c
			ORDER BY c.sortOrder ASC, c.name ASC
			""")
	List<EventCategory> findAllOrdered();

	@Query("""
			SELECT COALESCE(MAX(c.sortOrder), 0) FROM EventCategory c
			""")
	int findMaxSortOrder();
}
