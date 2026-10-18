package com.afrea.yee.users;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Les suppressions antérieures n'anonymisaient que la ligne {@code users}.
 * Au démarrage, on les retire définitivement de la base.
 */
@Component
public class AnonymizedAccountCleanup {

	private static final Logger log = LoggerFactory.getLogger(AnonymizedAccountCleanup.class);

	private final AccountDeletionService accountDeletionService;

	public AnonymizedAccountCleanup(AccountDeletionService accountDeletionService) {
		this.accountDeletionService = accountDeletionService;
	}

	@EventListener(ApplicationReadyEvent.class)
	public void onReady() {
		int removed = accountDeletionService.purgeAnonymizedAccounts();
		if (removed > 0) {
			log.info("Suppression définitive de {} compte(s) précédemment anonymisé(s).", removed);
		}
	}
}
