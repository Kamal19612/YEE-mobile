package com.afrea.yee.users;

import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.groups.repository.GroupMemberRepository;
import com.afrea.yee.groups.repository.GroupRepository;
import com.afrea.yee.users.dto.CommunitySummaryResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommunitySummaryService {

	private static final UUID NO_GROUP = UUID.fromString("00000000-0000-0000-0000-000000000000");

	private final UserRepository userRepository;
	private final GroupRepository groupRepository;
	private final GroupMemberRepository groupMemberRepository;

	public CommunitySummaryService(
			UserRepository userRepository,
			GroupRepository groupRepository,
			GroupMemberRepository groupMemberRepository) {
		this.userRepository = userRepository;
		this.groupRepository = groupRepository;
		this.groupMemberRepository = groupMemberRepository;
	}

	/**
	 * Membres de l'annuaire et groupes visibles pour ce visiteur.
	 * Un groupe secret n'est compté que s'il fait déjà partie de ses groupes.
	 */
	@Transactional(readOnly = true)
	public CommunitySummaryResponse summary(UUID viewerId) {
		List<UUID> secretVisible = viewerId == null
				? List.of(NO_GROUP)
				: groupMemberRepository.findGroupIdsVisibleToUser(viewerId);
		if (secretVisible.isEmpty()) {
			secretVisible = List.of(NO_GROUP);
		}
		return new CommunitySummaryResponse(
				userRepository.countDirectory(),
				groupRepository.countVisible(secretVisible));
	}
}
