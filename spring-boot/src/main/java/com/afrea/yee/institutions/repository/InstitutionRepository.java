package com.afrea.yee.institutions.repository;

import com.afrea.yee.institutions.entity.Institution;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InstitutionRepository extends JpaRepository<Institution, UUID> {

	boolean existsBySlug(String slug);

	@Query("""
			SELECT i FROM Institution i
			WHERE i.deletedAt IS NULL AND i.parent IS NULL
			  AND (:search IS NULL OR :search = '' OR LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%')))
			ORDER BY i.name ASC
			""")
	List<Institution> findRoots(@Param("search") String search);

	@Query("""
			SELECT i FROM Institution i
			LEFT JOIN FETCH i.parent
			WHERE i.deletedAt IS NULL AND i.parent.id = :parentId
			  AND (:search IS NULL OR :search = '' OR LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%')))
			ORDER BY i.name ASC
			""")
	List<Institution> findChildren(@Param("parentId") UUID parentId, @Param("search") String search);

	@Query("""
			SELECT i FROM Institution i
			LEFT JOIN FETCH i.parent
			WHERE i.deletedAt IS NULL AND i.type = :type
			  AND (:search IS NULL OR :search = '' OR LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%')))
			ORDER BY i.name ASC
			""")
	List<Institution> findByType(@Param("type") String type, @Param("search") String search);

	@Query("""
			SELECT i FROM Institution i
			LEFT JOIN FETCH i.parent
			WHERE i.deletedAt IS NULL
			  AND (:search IS NULL OR :search = '' OR LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%')))
			ORDER BY i.type ASC, i.name ASC
			""")
	List<Institution> findAllActive(@Param("search") String search);

	@Query("""
			SELECT i FROM Institution i
			LEFT JOIN FETCH i.parent
			WHERE i.id = :id AND i.deletedAt IS NULL
			""")
	Optional<Institution> findActiveById(@Param("id") UUID id);

	@Query("""
			SELECT CASE WHEN COUNT(i) > 0 THEN true ELSE false END
			FROM Institution i
			WHERE i.parent.id = :parentId AND i.deletedAt IS NULL
			""")
	boolean hasActiveChildren(@Param("parentId") UUID parentId);

	@Query("""
			SELECT i FROM Institution i
			LEFT JOIN FETCH i.parent
			WHERE i.deletedAt IS NULL AND i.id IN :ids
			ORDER BY i.name ASC
			""")
	List<Institution> findActiveByIds(@Param("ids") Collection<UUID> ids);

	/**
	 * Cascade : référent du nœud OU d'un ancêtre.
	 * SQL généré (WITH RECURSIVE ancestors remonte parent_id jusqu'à la racine).
	 */
	@Query(value = """
			WITH RECURSIVE ancestors AS (
			    SELECT id, parent_id
			    FROM institutions
			    WHERE id = :institutionId AND deleted_at IS NULL
			    UNION ALL
			    SELECT i.id, i.parent_id
			    FROM institutions i
			    INNER JOIN ancestors a ON i.id = a.parent_id
			    WHERE i.deleted_at IS NULL
			)
			SELECT COUNT(*)
			FROM institution_referents r
			WHERE r.user_id = :userId
			  AND r.institution_id IN (SELECT id FROM ancestors)
			""", nativeQuery = true)
	long countReferentOnAncestors(@Param("institutionId") UUID institutionId, @Param("userId") UUID userId);

	/**
	 * Institutions où le viewer a autorité (référent direct ∪ descendants).
	 */
	@Query(value = """
			WITH RECURSIVE tree AS (
			    SELECT i.id
			    FROM institutions i
			    INNER JOIN institution_referents r ON r.institution_id = i.id
			    WHERE r.user_id = :userId AND i.deleted_at IS NULL
			    UNION ALL
			    SELECT c.id
			    FROM institutions c
			    INNER JOIN tree t ON c.parent_id = t.id
			    WHERE c.deleted_at IS NULL
			)
			SELECT id FROM tree
			""", nativeQuery = true)
	List<UUID> findIdsWithReferentAuthority(@Param("userId") UUID userId);

	/**
	 * Nœud + descendants (pays → clubs, continent → pays + clubs).
	 */
	@Query(value = """
			WITH RECURSIVE tree AS (
			    SELECT id
			    FROM institutions
			    WHERE id = :institutionId AND deleted_at IS NULL
			    UNION ALL
			    SELECT c.id
			    FROM institutions c
			    INNER JOIN tree t ON c.parent_id = t.id
			    WHERE c.deleted_at IS NULL
			)
			SELECT id FROM tree
			""", nativeQuery = true)
	List<UUID> findDescendantIdsIncludingSelf(@Param("institutionId") UUID institutionId);

	/**
	 * Référents directs du nœud et de tous ses ancêtres (ceux qui peuvent valider).
	 */
	@Query(value = """
			WITH RECURSIVE ancestors AS (
			    SELECT id, parent_id
			    FROM institutions
			    WHERE id = :institutionId AND deleted_at IS NULL
			    UNION ALL
			    SELECT i.id, i.parent_id
			    FROM institutions i
			    INNER JOIN ancestors a ON i.id = a.parent_id
			    WHERE i.deleted_at IS NULL
			)
			SELECT DISTINCT r.user_id
			FROM institution_referents r
			WHERE r.institution_id IN (SELECT id FROM ancestors)
			""", nativeQuery = true)
	List<UUID> findCascadeReferentUserIds(@Param("institutionId") UUID institutionId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = "UPDATE institutions SET members_count = members_count + :delta WHERE id = :id", nativeQuery = true)
	int bumpMembers(@Param("id") UUID id, @Param("delta") int delta);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			UPDATE institutions
			SET members_count = GREATEST(0, members_count + :delta)
			WHERE id = :id
			""", nativeQuery = true)
	int adjustMembers(@Param("id") UUID id, @Param("delta") int delta);
}
