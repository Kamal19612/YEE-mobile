package com.afrea.yee.users;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.media.ObjectStorage;
import java.util.List;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountDeletionService {

	private final UserRepository userRepository;
	private final AccountPurgeRepository accountPurgeRepository;
	private final ObjectStorage objectStorage;
	private final ApplicationEventPublisher events;

	public AccountDeletionService(
			UserRepository userRepository,
			AccountPurgeRepository accountPurgeRepository,
			ObjectStorage objectStorage,
			ApplicationEventPublisher events) {
		this.userRepository = userRepository;
		this.accountPurgeRepository = accountPurgeRepository;
		this.objectStorage = objectStorage;
		this.events = events;
	}

	@Transactional
	public int purgeAnonymizedAccounts() {
		List<User> leftover = userRepository.findByAccountDeletedTrue();
		for (User user : leftover) {
			purge(user);
		}
		return leftover.size();
	}

	@Transactional
	public void purge(User user) {
		UUID userId = user.getId();
		String avatarPath = user.getAvatarStoragePath();
		String coverPath = user.getCoverStoragePath();
		userRepository.flush();
		List<AccountPurgeRepository.StoredMedia> mediaPaths = accountPurgeRepository.findPostMediaFiles(userId);
		List<String> chatMediaPaths = accountPurgeRepository.findChatMediaStoragePaths(userId);

		accountPurgeRepository.adjustCountsAndDeleteDependents(userId);
		userRepository.delete(user);
		userRepository.flush();

		deleteQuietly("avatars", avatarPath);
		deleteQuietly("covers", coverPath);
		for (AccountPurgeRepository.StoredMedia file : mediaPaths) {
			deleteQuietly(file.bucket(), file.path());
		}
		for (String path : chatMediaPaths) {
			deleteQuietly("chat-media", path);
		}

		events.publishEvent(new AccountDeletedEvent(userId));
	}

	private void deleteQuietly(String bucket, String path) {
		if (path == null || path.isBlank()) {
			return;
		}
		objectStorage.delete(bucket, path);
	}
}
