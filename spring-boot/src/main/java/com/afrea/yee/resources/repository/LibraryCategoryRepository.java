package com.afrea.yee.resources.repository;

import com.afrea.yee.resources.entity.LibraryCategory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface LibraryCategoryRepository extends JpaRepository<LibraryCategory, UUID> {

	boolean existsBySlug(String slug);

	Optional<LibraryCategory> findBySlug(String slug);

	@Query("""
			SELECT c FROM LibraryCategory c
			ORDER BY c.sortOrder ASC, c.name ASC
			""")
	List<LibraryCategory> findAllOrdered();

	@Query("""
			SELECT COALESCE(MAX(c.sortOrder), 0) FROM LibraryCategory c
			""")
	int findMaxSortOrder();
}
