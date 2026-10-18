package com.afrea.yee.feed.repository;

import com.afrea.yee.feed.entity.PostLike;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostLikeRepository extends JpaRepository<PostLike, PostLike.PostLikeId> {

	boolean existsByPostIdAndUserId(Long postId, UUID userId);

	@Query("SELECT pl.postId FROM PostLike pl WHERE pl.userId = :userId AND pl.postId IN :postIds")
	List<Long> findLikedPostIds(@Param("userId") UUID userId, @Param("postIds") Collection<Long> postIds);

	@Query("""
			SELECT pl FROM PostLike pl
			JOIN FETCH pl.user u
			WHERE pl.postId = :postId
			  AND u.accountDeleted = false
			  AND pl.createdAt < :before
			ORDER BY pl.createdAt DESC
			""")
	List<PostLike> findByPost(
			@Param("postId") Long postId,
			@Param("before") Instant before,
			Pageable pageable);

	@Query("""
			SELECT pl FROM PostLike pl
			LEFT JOIN FETCH pl.post
			WHERE pl.userId = :userId
			  AND pl.createdAt < :before
			ORDER BY pl.createdAt DESC
			""")
	List<PostLike> findByUserForAdmin(
			@Param("userId") UUID userId,
			@Param("before") Instant before,
			Pageable pageable);
}
