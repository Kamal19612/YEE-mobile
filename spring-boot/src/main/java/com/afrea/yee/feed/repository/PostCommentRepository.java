package com.afrea.yee.feed.repository;

import com.afrea.yee.feed.entity.PostComment;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

	@Query("""
			SELECT c FROM PostComment c
			JOIN FETCH c.author
			WHERE c.post.id = :postId
			  AND c.deletedAt IS NULL
			  AND c.parent IS NULL
			  AND (:beforeId IS NULL OR c.id < :beforeId)
			ORDER BY c.id DESC
			""")
	List<PostComment> findRootsByPost(
			@Param("postId") Long postId,
			@Param("beforeId") Long beforeId,
			Pageable pageable);

	@Query("""
			SELECT c FROM PostComment c
			JOIN FETCH c.author
			JOIN FETCH c.parent
			WHERE c.parent.id IN :parentIds
			  AND c.deletedAt IS NULL
			ORDER BY c.id ASC
			""")
	List<PostComment> findRepliesByParentIds(@Param("parentIds") Collection<Long> parentIds);

	@Query("""
			SELECT c FROM PostComment c
			WHERE c.parent.id = :parentId
			  AND c.deletedAt IS NULL
			""")
	List<PostComment> findActiveReplies(@Param("parentId") Long parentId);

	@Query("""
			SELECT c FROM PostComment c
			JOIN FETCH c.author
			JOIN FETCH c.post
			LEFT JOIN FETCH c.parent p
			LEFT JOIN FETCH p.author
			WHERE c.id = :id AND c.deletedAt IS NULL
			""")
	Optional<PostComment> findActiveById(@Param("id") Long id);

	@Query("""
			SELECT c FROM PostComment c
			JOIN FETCH c.post
			WHERE c.author.id = :userId
			  AND c.deletedAt IS NULL
			  AND c.createdAt < :before
			ORDER BY c.createdAt DESC
			""")
	List<PostComment> findByAuthorForAdmin(
			@Param("userId") UUID userId,
			@Param("before") Instant before,
			Pageable pageable);
}
