package com.afrea.yee.conversations.repository;

import com.afrea.yee.conversations.entity.ConversationParticipant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {

	Optional<ConversationParticipant> findByConversationIdAndUserId(UUID conversationId, UUID userId);

	List<ConversationParticipant> findByConversationId(UUID conversationId);

	@Query("""
			SELECT p FROM ConversationParticipant p
			WHERE p.conversation.id IN :conversationIds
			""")
	List<ConversationParticipant> findByConversationIdIn(@Param("conversationIds") Collection<UUID> conversationIds);

	@Query("""
			SELECT p.userId FROM ConversationParticipant p
			WHERE p.conversation.id = :conversationId
			""")
	List<UUID> findUserIdsByConversationId(@Param("conversationId") UUID conversationId);

	boolean existsByConversationIdAndUserId(UUID conversationId, UUID userId);
}
