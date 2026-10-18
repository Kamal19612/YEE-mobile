package com.afrea.yee.feed.repository;

import com.afrea.yee.feed.entity.Post;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {

	@Query("""
			SELECT p FROM Post p
			JOIN FETCH p.author
			LEFT JOIN FETCH p.linkPreview
			WHERE p.deletedAt IS NULL
			  AND p.groupId IS NULL
			  AND (:beforeId IS NULL OR p.id < :beforeId)
			  AND (:authorId IS NULL OR p.author.id = :authorId)
			ORDER BY p.id DESC
			""")
	List<Post> findGlobalFeed(
			@Param("beforeId") Long beforeId,
			@Param("authorId") UUID authorId,
			Pageable pageable);

	@Query("""
			SELECT p FROM Post p
			JOIN FETCH p.author
			LEFT JOIN FETCH p.linkPreview
			WHERE p.deletedAt IS NULL
			  AND p.groupId = :groupId
			  AND (:beforeId IS NULL OR p.id < :beforeId)
			ORDER BY p.id DESC
			""")
	List<Post> findGroupFeed(
			@Param("groupId") UUID groupId,
			@Param("beforeId") Long beforeId,
			Pageable pageable);

	@Query("""
			SELECT p FROM Post p
			JOIN FETCH p.author
			LEFT JOIN FETCH p.linkPreview
			WHERE p.id = :id AND p.deletedAt IS NULL
			""")
	Optional<Post> findActiveById(@Param("id") Long id);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = "UPDATE posts SET likes_count = likes_count + 1 WHERE id = :id", nativeQuery = true)
	int bumpLikes(@Param("id") Long id);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = "UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = :id", nativeQuery = true)
	int dropLikes(@Param("id") Long id);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = "UPDATE posts SET comments_count = comments_count + 1 WHERE id = :id", nativeQuery = true)
	int bumpComments(@Param("id") Long id);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = "UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = :id", nativeQuery = true)
	int dropComments(@Param("id") Long id);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = "UPDATE posts SET comments_count = GREATEST(0, comments_count - :n) WHERE id = :id", nativeQuery = true)
	int dropCommentsBy(@Param("id") Long id, @Param("n") int n);

	@Query("""
			SELECT p FROM Post p
			WHERE p.author.id = :userId
			  AND p.deletedAt IS NULL
			  AND p.createdAt < :before
			ORDER BY p.createdAt DESC
			""")
	List<Post> findByAuthorForAdmin(
			@Param("userId") UUID userId,
			@Param("before") Instant before,
			Pageable pageable);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			UPDATE posts
			SET deleted_at = :now
			WHERE author_id = :userId
			  AND deleted_at IS NULL
			""", nativeQuery = true)
	int softDeleteByAuthor(@Param("userId") UUID userId, @Param("now") Instant now);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			UPDATE posts
			SET deleted_at = :now
			WHERE group_id = :groupId
			  AND deleted_at IS NULL
			""", nativeQuery = true)
	int softDeleteByGroup(@Param("groupId") UUID groupId, @Param("now") Instant now);

	/** Détache les posts des link_previews expirés avant purge (FK sans ON DELETE). */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(value = """
			UPDATE posts
			SET link_preview_id = NULL
			WHERE link_preview_id IN (
			    SELECT id FROM link_previews WHERE expires_at < :now
			)
			""", nativeQuery = true)
	int clearExpiredLinkPreviewRefs(@Param("now") java.time.Instant now);
}
