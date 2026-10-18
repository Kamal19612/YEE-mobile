package com.afrea.yee.users;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.users.dto.UserListItemResponse;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserSearchService {

	private final UserRepository userRepository;
	private final UserTransformer userTransformer;

	public UserSearchService(UserRepository userRepository, UserTransformer userTransformer) {
		this.userRepository = userRepository;
		this.userTransformer = userTransformer;
	}

	@Transactional(readOnly = true)
	public List<UserListItemResponse> search(String q) {
		String query = q == null ? "" : q.trim();
		if (query.length() < 2) {
			throw new AppException(
					"validation_failed",
					"La requête contient des données invalides.",
					HttpStatus.UNPROCESSABLE_ENTITY,
					Map.of("fields", Map.of("q", "Minimum 2 caractères.")));
		}

		List<User> users;
		if (query.contains("@")) {
			users = userRepository.findActiveByExactEmail(query).stream().toList();
		} else {
			users = userRepository.searchByDisplayName(query, PageRequest.of(0, 10));
		}
		return users.stream().map(userTransformer::toListItem).toList();
	}
}
