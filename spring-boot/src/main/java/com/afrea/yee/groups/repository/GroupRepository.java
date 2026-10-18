package com.afrea.yee.groups.repository;

import com.afrea.yee.groups.entity.GroupEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GroupRepository extends JpaRepository<GroupEntity, UUID> {

	boolean existsBySlug(String slug);

	@Query("""
			SELECT g FROM GroupEntity g
			WHERE g.deletedAt IS NULL
			  AND (:search IS NULL OR :search = '' OR LOWER(g.name) LIKE LOWER(CONCAT('%', :search, '%')))
			  AND (
			    g.visibility <> 'secret'
			    OR g.id IN :visibleSecretIds
			  )
			ORDER BY g.createdAt DESC
			""")
	List<GroupEntity> searchVisible(
			@Param("search") String search,
			@Param("visibleSecretIds") List<UUID> visibleSecretIds);

	/**
	 * Groupes encore présents, hors secrets que le visiteur ne peut pas voir.
	 * visibleSecretIds ne doit pas être vide (JPQL IN).
	 */
	@Query("""
			SELECT COUNT(g) FROM GroupEntity g
			WHERE g.deletedAt IS NULL
			  AND (
			    g.visibility <> 'secret'
			    OR g.id IN :visibleSecretIds
			  )
			""")
	long countVisible(@Param("visibleSecretIds") List<UUID> visibleSecretIds);

	@Query("""
			SELECT g FROM GroupEntity g
			WHERE g.deletedAt IS NULL
			  AND g.id IN :ids
			ORDER BY g.createdAt DESC
			""")
	List<GroupEntity> findActiveByIds(@Param("ids") List<UUID> ids);

	@Query("""
			SELECT g FROM GroupEntity g
			WHERE g.id = :id AND g.deletedAt IS NULL
			""")
	Optional<GroupEntity> findActiveById(@Param("id") UUID id);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = "UPDATE app_groups SET members_count = members_count + :delta WHERE id = :id", nativeQuery = true)
	int bumpMembers(@Param("id") UUID id, @Param("delta") int delta);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			UPDATE app_groups
			SET members_count = GREATEST(0, members_count + :delta)
			WHERE id = :id
			""", nativeQuery = true)
	int adjustMembers(@Param("id") UUID id, @Param("delta") int delta);
}
