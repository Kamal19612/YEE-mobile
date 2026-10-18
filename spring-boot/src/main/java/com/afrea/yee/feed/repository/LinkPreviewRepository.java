package com.afrea.yee.feed.repository;

import com.afrea.yee.feed.entity.LinkPreview;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LinkPreviewRepository extends JpaRepository<LinkPreview, Long> {
	Optional<LinkPreview> findByUrlHash(String urlHash);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
			DELETE FROM LinkPreview lp
			WHERE lp.expiresAt < :now
			""")
	int deleteExpired(@Param("now") Instant now);
}
