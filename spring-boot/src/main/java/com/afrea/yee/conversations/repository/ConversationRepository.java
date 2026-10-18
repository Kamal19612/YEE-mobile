package com.afrea.yee.conversations.repository;

import com.afrea.yee.conversations.entity.Conversation;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

	Optional<Conversation> findByGroupId(UUID groupId);

	@Query("""
			SELECT c FROM Conversation c
			JOIN ConversationParticipant p1 ON p1.conversation = c AND p1.userId = :userA
			JOIN ConversationParticipant p2 ON p2.conversation = c AND p2.userId = :userB
			WHERE c.type = 'dm'
			  AND (SELECT COUNT(p) FROM ConversationParticipant p WHERE p.conversation = c) = 2
			""")
	Optional<Conversation> findDmBetween(@Param("userA") UUID userA, @Param("userB") UUID userB);

	@Query("""
			SELECT c FROM Conversation c
			JOIN ConversationParticipant p ON p.conversation = c
			WHERE p.userId = :userId
			  AND p.hiddenAt IS NULL
			  AND (
			    c.type = 'dm'
			    OR EXISTS (
			      SELECT 1 FROM GroupEntity g WHERE g.id = c.groupId AND g.deletedAt IS NULL
			    )
			  )
			ORDER BY c.updatedAt DESC
			""")
	Page<Conversation> findInbox(@Param("userId") UUID userId, Pageable pageable);

	@Query("""
			SELECT DISTINCT c FROM Conversation c
			JOIN ConversationParticipant me ON me.conversation = c AND me.userId = :userId
			JOIN ConversationParticipant other ON other.conversation = c
			JOIN User u ON u.id = other.userId
			WHERE c.type = 'dm'
			  AND me.hiddenAt IS NULL
			  AND other.userId <> :userId
			  AND LOWER(u.displayName) LIKE LOWER(CONCAT('%', :q, '%'))
			ORDER BY c.updatedAt DESC
			""")
	List<Conversation> searchDmByParticipantName(@Param("userId") UUID userId, @Param("q") String q, Pageable pageable);

	@Query("""
			SELECT c FROM Conversation c
			JOIN GroupEntity g ON g.id = c.groupId
			JOIN ConversationParticipant me ON me.conversation = c AND me.userId = :userId
			WHERE c.type = 'group'
			  AND me.hiddenAt IS NULL
			  AND g.deletedAt IS NULL
			  AND LOWER(g.name) LIKE LOWER(CONCAT('%', :q, '%'))
			ORDER BY c.updatedAt DESC
			""")
	List<Conversation> searchGroupByName(@Param("userId") UUID userId, @Param("q") String q, Pageable pageable);

	@Query("""
			SELECT c FROM Conversation c
			JOIN ConversationParticipant p ON p.conversation = c
			WHERE p.userId = :userId
			ORDER BY c.updatedAt DESC
			""")
	List<Conversation> findAllForUser(@Param("userId") UUID userId, Pageable pageable);

	@Query("""
			SELECT c FROM Conversation c
			WHERE c.id IN :ids
			""")
	List<Conversation> findAllByIdIn(@Param("ids") Collection<UUID> ids);
}
