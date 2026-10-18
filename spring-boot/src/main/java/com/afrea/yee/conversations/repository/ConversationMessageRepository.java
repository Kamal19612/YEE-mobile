package com.afrea.yee.conversations.repository;

import com.afrea.yee.conversations.entity.ConversationMessage;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationMessageRepository extends JpaRepository<ConversationMessage, Long> {

	/** Fil visible : inclut les tombstones (deleted_at non null). */
	@Query("""
			SELECT m FROM ConversationMessage m
			WHERE m.conversation.id = :conversationId
			  AND m.createdAt >= :visibleFrom
			ORDER BY m.createdAt DESC
			""")
	Page<ConversationMessage> findVisiblePage(
			@Param("conversationId") UUID conversationId,
			@Param("visibleFrom") Instant visibleFrom,
			Pageable pageable);

	@Query("""
			SELECT m FROM ConversationMessage m
			WHERE m.conversation.id IN :conversationIds
			  AND m.deletedAt IS NULL
			  AND m.createdAt = (
			    SELECT MAX(m2.createdAt) FROM ConversationMessage m2
			    WHERE m2.conversation.id = m.conversation.id
			      AND m2.deletedAt IS NULL
			  )
			""")
	List<ConversationMessage> findLatestForConversations(@Param("conversationIds") Collection<UUID> conversationIds);

	@Query("""
			SELECT m FROM ConversationMessage m
			WHERE m.conversation.id = :conversationId
			  AND m.deletedAt IS NULL
			ORDER BY m.createdAt DESC
			""")
	List<ConversationMessage> findLatest(@Param("conversationId") UUID conversationId, Pageable pageable);

	@Query("""
			SELECT COUNT(m) FROM ConversationMessage m
			JOIN ConversationParticipant p ON p.conversation = m.conversation AND p.userId = :userId
			WHERE m.senderId <> :userId
			  AND m.deletedAt IS NULL
			  AND p.hiddenAt IS NULL
			  AND m.createdAt >= p.joinedAt
			  AND (p.lastReadAt IS NULL OR m.createdAt > p.lastReadAt)
			""")
	long countUnreadMessages(@Param("userId") UUID userId);

	@Query("""
			SELECT COUNT(DISTINCT m.conversation.id) FROM ConversationMessage m
			JOIN ConversationParticipant p ON p.conversation = m.conversation AND p.userId = :userId
			WHERE m.senderId <> :userId
			  AND m.deletedAt IS NULL
			  AND p.hiddenAt IS NULL
			  AND m.createdAt >= p.joinedAt
			  AND (p.lastReadAt IS NULL OR m.createdAt > p.lastReadAt)
			""")
	long countUnreadThreads(@Param("userId") UUID userId);

	@Query("""
			SELECT COUNT(m) FROM ConversationMessage m
			WHERE m.conversation.id = :conversationId
			  AND m.senderId <> :userId
			  AND m.deletedAt IS NULL
			  AND m.createdAt >= :visibleFrom
			  AND m.createdAt > :lastReadAt
			""")
	long countUnreadInConversation(
			@Param("conversationId") UUID conversationId,
			@Param("userId") UUID userId,
			@Param("visibleFrom") Instant visibleFrom,
			@Param("lastReadAt") Instant lastReadAt);

	@Query("""
			SELECT m FROM ConversationMessage m
			JOIN ConversationParticipant p ON p.conversation = m.conversation AND p.userId = :userId
			WHERE m.deletedAt IS NULL
			  AND LOWER(m.body) LIKE LOWER(CONCAT('%', :q, '%'))
			  AND p.hiddenAt IS NULL
			  AND m.createdAt >= p.joinedAt
			ORDER BY m.createdAt DESC
			""")
	Page<ConversationMessage> searchBody(
			@Param("userId") UUID userId,
			@Param("q") String q,
			Pageable pageable);

	@Modifying
	@Query("DELETE FROM ConversationMessage m WHERE m.createdAt < :cutoff")
	int deleteOlderThan(@Param("cutoff") Instant cutoff);

	Optional<ConversationMessage> findByIdAndConversationId(Long id, UUID conversationId);
}
