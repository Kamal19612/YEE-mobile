package com.afrea.yee.groups;

import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.feed.entity.Post;
import com.afrea.yee.groups.entity.GroupEntity;
import com.afrea.yee.groups.repository.GroupRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Décide qui peut lire le contenu d'un groupe : posts, commentaires, likes.
 * <p>
 * Un groupe {@code public} est lisible par tout le monde, même sans session.
 * Un groupe {@code private} ou {@code secret} ne l'est que par un membre au
 * statut {@code active}, ou par un administrateur du site. Une demande
 * d'adhésion ({@code pending}) ou une invitation non acceptée ne suffit pas.
 * <p>
 * Le refus est un 404, le même que pour une ressource absente, afin de ne pas
 * confirmer qu'un contenu caché existe.
 */
@Component
public class GroupFeedAccess {

	private final GroupRepository groupRepository;
	private final GroupPermissions groupPermissions;

	public GroupFeedAccess(GroupRepository groupRepository, GroupPermissions groupPermissions) {
		this.groupRepository = groupRepository;
		this.groupPermissions = groupPermissions;
	}

	/**
	 * Fil demandé par identifiant de groupe ({@code GET /feed?groupId=}).
	 * Groupe inconnu, supprimé, ou non lisible : « Groupe introuvable ».
	 */
	public void requireGroupFeed(UUID groupId, UUID viewerId) {
		GroupEntity group = groupRepository.findActiveById(groupId)
				.orElseThrow(() -> hiddenGroup());
		if (!canRead(group, viewerId)) {
			throw hiddenGroup();
		}
	}

	/**
	 * Détail d'un post, liste de commentaires ou de likes.
	 * Un post du fil global (sans groupe) reste public.
	 * Un post de groupe illisible est présenté comme une publication absente.
	 */
	public void requirePostReadable(Post post, UUID viewerId) {
		if (post.getGroupId() == null) {
			return;
		}
		GroupEntity group = groupRepository.findActiveById(post.getGroupId()).orElse(null);
		if (group == null || !canRead(group, viewerId)) {
			throw hiddenPost();
		}
	}

	private boolean canRead(GroupEntity group, UUID viewerId) {
		// Tout visiteur, y compris anonyme, peut lire un groupe public.
		if ("public".equals(group.getVisibility())) {
			return true;
		}
		if (groupPermissions.isSiteAdmin(viewerId)) {
			return true;
		}
		return groupPermissions.membership(group.getId(), viewerId)
				.filter(member -> "active".equals(member.getStatus()))
				.isPresent();
	}

	private static AppException hiddenGroup() {
		return new AppException("not_found", "Groupe introuvable.", HttpStatus.NOT_FOUND);
	}

	private static AppException hiddenPost() {
		return new AppException("not_found", "Publication introuvable.", HttpStatus.NOT_FOUND);
	}
}
