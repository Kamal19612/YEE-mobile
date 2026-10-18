package com.afrea.yee.conversations.repository;

import com.afrea.yee.conversations.entity.ConversationMessageMedia;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConversationMessageMediaRepository extends JpaRepository<ConversationMessageMedia, Long> {

	@Query("""
			SELECT m FROM ConversationMessageMedia m
			WHERE m.message.id IN :messageIds
			ORDER BY m.sortOrder ASC
			""")
	List<ConversationMessageMedia> findForMessages(@Param("messageIds") Collection<Long> messageIds);

	/** Charge le message et la conversation pour contrôler l'accès avant lecture du fichier. */
	@Query("""
			SELECT m FROM ConversationMessageMedia m
			JOIN FETCH m.message msg
			JOIN FETCH msg.conversation
			WHERE m.id = :id
			""")
	Optional<ConversationMessageMedia> findWithConversation(@Param("id") Long id);
}
