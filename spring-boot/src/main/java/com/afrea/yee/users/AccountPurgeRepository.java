package com.afrea.yee.users;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountPurgeRepository {

	private final JdbcTemplate jdbc;

	public AccountPurgeRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<String> findChatMediaStoragePaths(UUID userId) {
		return jdbc.queryForList(
				"""
				SELECT cmm.storage_path
				FROM conversation_message_media cmm
				INNER JOIN conversation_messages cm ON cm.id = cmm.message_id
				WHERE cm.sender_id = ?
				  AND cmm.storage_path IS NOT NULL
				""",
				String.class,
				userId);
	}

	public List<StoredMedia> findPostMediaFiles(UUID userId) {
		return jdbc.query(
				"""
				SELECT COALESCE(pm.storage_bucket, 'post-media'), pm.storage_path
				FROM post_media pm
				INNER JOIN posts p ON p.id = pm.post_id
				WHERE p.author_id = ?
				  AND pm.storage_path IS NOT NULL
				""",
				(rs, row) -> new StoredMedia(rs.getString(1), rs.getString(2)),
				userId);
	}

	public record StoredMedia(String bucket, String path) {
	}

	/**
	 * Ajuste les compteurs dénormalisés des autres entités, puis efface toutes
	 * les lignes qui référencent l'utilisateur (sauf la ligne {@code users}).
	 */
	public void adjustCountsAndDeleteDependents(UUID userId) {
		jdbc.update(
				"""
				UPDATE users
				SET followers_count = GREATEST(0, followers_count - 1)
				WHERE id IN (SELECT followee_id FROM follows WHERE follower_id = ?)
				""",
				userId);
		jdbc.update(
				"""
				UPDATE users
				SET following_count = GREATEST(0, following_count - 1)
				WHERE id IN (SELECT follower_id FROM follows WHERE followee_id = ?)
				""",
				userId);

		jdbc.update(
				"""
				UPDATE app_groups
				SET members_count = GREATEST(0, members_count - 1)
				WHERE id IN (
				    SELECT group_id FROM group_members
				    WHERE user_id = ? AND status = 'active'
				)
				""",
				userId);
		jdbc.update(
				"""
				UPDATE institutions
				SET members_count = GREATEST(0, members_count - 1)
				WHERE id IN (
				    SELECT institution_id FROM user_institutions
				    WHERE user_id = ? AND status = 'active'
				)
				""",
				userId);

		jdbc.update(
				"""
				UPDATE posts p
				SET likes_count = GREATEST(0, likes_count - sub.n)
				FROM (
				    SELECT post_id, COUNT(*) AS n
				    FROM post_likes
				    WHERE user_id = ?
				    GROUP BY post_id
				) sub
				WHERE p.id = sub.post_id
				  AND p.author_id <> ?
				""",
				userId,
				userId);
		jdbc.update(
				"""
				UPDATE posts p
				SET comments_count = GREATEST(0, comments_count - sub.n)
				FROM (
				    SELECT post_id, COUNT(*) AS n
				    FROM post_comments
				    WHERE author_id = ? AND deleted_at IS NULL
				    GROUP BY post_id
				) sub
				WHERE p.id = sub.post_id
				  AND p.author_id <> ?
				""",
				userId,
				userId);

		jdbc.update("UPDATE app_groups SET created_by = NULL WHERE created_by = ?", userId);
		jdbc.update("UPDATE institutions SET created_by = NULL WHERE created_by = ?", userId);

		jdbc.update(
				"""
				DELETE FROM notifications
				WHERE user_id = ? OR actor_id = ?
				""",
				userId,
				userId);
		jdbc.update("DELETE FROM refresh_tokens WHERE user_id = ?", userId);
		jdbc.update(
				"""
				DELETE FROM follows
				WHERE follower_id = ? OR followee_id = ?
				""",
				userId,
				userId);
		jdbc.update(
				"""
				DELETE FROM conversation_message_media
				WHERE message_id IN (SELECT id FROM conversation_messages WHERE sender_id = ?)
				""",
				userId);
		jdbc.update("DELETE FROM conversation_messages WHERE sender_id = ?", userId);
		jdbc.update(
				"""
				DELETE FROM conversation_participants
				WHERE conversation_id IN (
				    SELECT c.id FROM conversations c
				    INNER JOIN conversation_participants p ON p.conversation_id = c.id
				    WHERE c.type = 'dm' AND p.user_id = ?
				)
				""",
				userId);
		jdbc.update(
				"""
				DELETE FROM conversation_message_media
				WHERE message_id IN (
				    SELECT cm.id FROM conversation_messages cm
				    WHERE cm.conversation_id IN (
				        SELECT c.id FROM conversations c
				        WHERE c.type = 'dm'
				          AND NOT EXISTS (
				              SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id
				          )
				    )
				)
				""");
		jdbc.update(
				"""
				DELETE FROM conversation_messages
				WHERE conversation_id IN (
				    SELECT c.id FROM conversations c
				    WHERE c.type = 'dm'
				      AND NOT EXISTS (
				          SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id
				      )
				)
				""");
		jdbc.update(
				"""
				DELETE FROM conversations
				WHERE type = 'dm'
				  AND NOT EXISTS (
				      SELECT 1 FROM conversation_participants p WHERE p.conversation_id = conversations.id
				  )
				""");
		jdbc.update("DELETE FROM conversation_participants WHERE user_id = ?", userId);

		jdbc.update("DELETE FROM group_members WHERE user_id = ?", userId);
		jdbc.update("DELETE FROM institution_referents WHERE user_id = ?", userId);
		jdbc.update("DELETE FROM user_institutions WHERE user_id = ?", userId);

		jdbc.update(
				"""
				UPDATE post_comments
				SET parent_id = NULL
				WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)
				""",
				userId);
		jdbc.update(
				"""
				DELETE FROM post_comments
				WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)
				""",
				userId);
		jdbc.update(
				"""
				DELETE FROM post_likes
				WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)
				""",
				userId);
		jdbc.update(
				"""
				DELETE FROM post_media
				WHERE post_id IN (SELECT id FROM posts WHERE author_id = ?)
				""",
				userId);
		jdbc.update("DELETE FROM posts WHERE author_id = ?", userId);

		jdbc.update(
				"""
				UPDATE post_comments AS c
				SET parent_id = NULL
				FROM post_comments AS p
				WHERE c.parent_id = p.id
				  AND p.author_id = ?
				""",
				userId);
		jdbc.update("DELETE FROM post_comments WHERE author_id = ?", userId);
		jdbc.update("DELETE FROM post_likes WHERE user_id = ?", userId);
	}
}
