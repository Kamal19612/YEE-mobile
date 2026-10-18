package com.afrea.yee.feed.repository;

import com.afrea.yee.feed.entity.PostMedia;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostMediaRepository extends JpaRepository<PostMedia, Long> {

	@Query("""
			SELECT m FROM PostMedia m
			WHERE m.post.id IN :postIds
			ORDER BY m.post.id ASC, m.sortOrder ASC
			""")
	List<PostMedia> findForPosts(@Param("postIds") Collection<Long> postIds);

	@Query("""
			SELECT m FROM PostMedia m
			JOIN FETCH m.post
			WHERE m.id = :id
			""")
	Optional<PostMedia> findWithPost(@Param("id") Long id);

	@Query("""
			SELECT m FROM PostMedia m
			JOIN FETCH m.post p
			WHERE p.id = :postId AND m.storagePath = :path
			""")
	Optional<PostMedia> findByPostAndPath(@Param("postId") Long postId, @Param("path") String path);
}
