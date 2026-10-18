package com.afrea.yee.notifications;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Construit le payload Web Push (titre/corps/URL) côté serveur —
 * le service worker n'a pas accès à i18n React.
 */
final class PushPayloadBuilder {

	private PushPayloadBuilder() {}

	static Map<String, Object> fromNotificationSummary(Map<String, Object> summary, long unreadCount) {
		String type = stringVal(summary != null ? summary.get("type") : null);
		String actor = actorName(summary);
		String subject = subjectName(summary);
		String id = stringVal(summary != null ? summary.get("id") : null);
		String targetId = stringVal(summary != null ? summary.get("targetId") : null);
		String subjectType = subjectType(summary);
		String subjectId = subjectId(summary);

		String title = "YEE network";
		String body = switch (type == null ? "" : type) {
			case "new_follower" -> actor + " est maintenant un follower";
			case "group_invitation" -> actor + " vous a invité à rejoindre " + subject;
			case "group_join_request" -> actor + " souhaite rejoindre " + subject;
			case "group_request_approved" -> "Votre demande pour " + subject + " a été approuvée";
			case "group_request_rejected" -> "Votre demande pour " + subject + " a été refusée";
			case "institution_affiliation_request" -> actor + " demande une affiliation à " + subject;
			case "institution_affiliation_approved" -> "Votre affiliation à " + subject + " a été approuvée";
			case "institution_affiliation_rejected" -> "Votre affiliation à " + subject + " a été refusée";
			case "post_like" -> actor + " a aimé votre publication";
			case "post_comment" -> actor + " a commenté votre publication";
			case "comment_reply" -> actor + " a répondu à votre commentaire";
			default -> unreadCount > 0
					? "Vous avez " + unreadCount + " notification(s) non lue(s)"
					: "Nouvelle notification";
		};

		String url = href(type, subjectType, subjectId, targetId, summary);

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("title", title);
		payload.put("body", body);
		payload.put("url", url);
		if (id != null) {
			payload.put("tag", "notif-" + id);
		}
		payload.put("icon", "/icon-192.png");
		return payload;
	}

	static Map<String, Object> fromMessage(
			String conversationId,
			String messageId,
			String senderName,
			String preview,
			boolean hasMedia) {
		String name = (senderName == null || senderName.isBlank()) ? "Quelqu’un" : senderName.trim();
		String body = preview != null && !preview.isBlank()
				? preview.trim()
				: (hasMedia ? "Pièce jointe" : "Nouveau message");

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("title", "Message de " + name);
		payload.put("body", body);
		payload.put("url", conversationId != null ? "/messages/" + conversationId : "/messages");
		if (messageId != null) {
			payload.put("tag", "msg-" + messageId);
		}
		payload.put("icon", "/icon-192.png");
		return payload;
	}

	@SuppressWarnings("unchecked")
	private static String actorName(Map<String, Object> summary) {
		if (summary == null) {
			return "Quelqu’un";
		}
		Object actor = summary.get("actor");
		if (actor instanceof Map<?, ?> map) {
			Object name = map.get("displayName");
			if (name != null && !String.valueOf(name).isBlank()) {
				return String.valueOf(name).trim();
			}
		}
		return "Quelqu’un";
	}

	@SuppressWarnings("unchecked")
	private static String subjectName(Map<String, Object> summary) {
		String type = subjectType(summary);
		Object subject = summary == null ? null : summary.get("subject");
		if (subject instanceof Map<?, ?> map) {
			Object name = map.get("name");
			if (name != null && !String.valueOf(name).isBlank()
					&& !"null".equalsIgnoreCase(String.valueOf(name))) {
				return String.valueOf(name).trim();
			}
		}
		if ("institution".equals(type)) {
			return "une institution";
		}
		if ("group".equals(type)) {
			return "un groupe";
		}
		return "un élément";
	}

	private static String subjectType(Map<String, Object> summary) {
		Object subject = summary == null ? null : summary.get("subject");
		if (subject instanceof Map<?, ?> map) {
			return stringVal(map.get("type"));
		}
		return null;
	}

	private static String subjectId(Map<String, Object> summary) {
		Object subject = summary == null ? null : summary.get("subject");
		if (subject instanceof Map<?, ?> map) {
			return stringVal(map.get("id"));
		}
		return null;
	}

	@SuppressWarnings("unchecked")
	private static String href(
			String type,
			String subjectType,
			String subjectId,
			String targetId,
			Map<String, Object> summary) {
		String actorId = null;
		Object actor = summary == null ? null : summary.get("actor");
		if (actor instanceof Map<?, ?> map) {
			actorId = stringVal(map.get("id"));
		}
		return switch (type == null ? "" : type) {
			case "new_follower" -> actorId != null ? "/members/" + actorId : "/members";
			case "group_invitation", "group_join_request", "group_request_approved", "group_request_rejected" ->
					subjectId != null ? "/groups/" + subjectId : "/groups";
			case "institution_affiliation_request" ->
					subjectId != null ? "/institutions/" + subjectId + "?tab=referent" : "/institutions";
			case "institution_affiliation_approved", "institution_affiliation_rejected" ->
					subjectId != null ? "/institutions/" + subjectId : "/institutions";
			case "post_like", "post_comment" ->
					subjectId != null ? "/feed/" + subjectId : "/";
			case "comment_reply" -> {
				if (subjectId == null) {
					yield "/";
				}
				if (targetId != null && !targetId.isBlank()) {
					yield "/feed/" + subjectId + "?comment=" + targetId;
				}
				yield "/feed/" + subjectId + "?comments=1";
			}
			default -> "/notifications";
		};
	}

	private static String stringVal(Object value) {
		if (value == null) {
			return null;
		}
		String s = String.valueOf(value).trim();
		return s.isEmpty() ? null : s;
	}
}
