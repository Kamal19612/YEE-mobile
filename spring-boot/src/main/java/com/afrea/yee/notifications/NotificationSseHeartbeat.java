package com.afrea.yee.notifications;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class NotificationSseHeartbeat {

	private final NotificationRealtimeHub hub;

	public NotificationSseHeartbeat(NotificationRealtimeHub hub) {
		this.hub = hub;
	}

	@Scheduled(fixedRate = 15_000)
	public void ping() {
		hub.heartbeat();
	}
}
