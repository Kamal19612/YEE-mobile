package com.afrea.yee.resources.repository;

import com.afrea.yee.resources.entity.LibraryResource;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LibraryResourceRepository extends JpaRepository<LibraryResource, UUID> {

	boolean existsBySlug(String slug);

	long countByCategoryId(UUID categoryId);

	@Query("""
			SELECT r FROM LibraryResource r
			JOIN FETCH r.category
			LEFT JOIN FETCH r.createdBy
			WHERE r.status = :status
			  AND (:categoryId IS NULL OR r.category.id = :categoryId)
			  AND (:language IS NULL OR :language = '' OR r.language = :language)
			  AND (
			    :search IS NULL OR :search = ''
			    OR LOWER(r.title) LIKE LOWER(CONCAT('%', :search, '%'))
			    OR LOWER(r.description) LIKE LOWER(CONCAT('%', :search, '%'))
			  )
			ORDER BY r.createdAt DESC
			""")
	List<LibraryResource> searchPublished(
			@Param("status") String status,
			@Param("categoryId") UUID categoryId,
			@Param("language") String language,
			@Param("search") String search);

	@Query("""
			SELECT r FROM LibraryResource r
			JOIN FETCH r.category
			LEFT JOIN FETCH r.createdBy
			WHERE r.id = :id
			""")
	Optional<LibraryResource> findWithAuthor(@Param("id") UUID id);
}
