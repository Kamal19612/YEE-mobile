package com.afrea.yee.events;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.ApiPaths;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.events.VideoLinkParser.ParsedVideo;
import com.afrea.yee.events.dto.EventReportResponse;
import com.afrea.yee.events.dto.EventResponse;
import com.afrea.yee.events.dto.EventVisualResponse;
import com.afrea.yee.events.entity.Event;
import com.afrea.yee.events.entity.EventCategory;
import com.afrea.yee.events.entity.EventReport;
import com.afrea.yee.events.entity.EventVisual;
import com.afrea.yee.events.repository.EventReportRepository;
import com.afrea.yee.events.repository.EventRepository;
import com.afrea.yee.events.repository.EventVisualRepository;
import com.afrea.yee.media.DocumentUploadValidator;
import com.afrea.yee.media.ImageUploadValidator;
import com.afrea.yee.media.ObjectStorage;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

@Service
public class EventService {

	public static final String BUCKET = "events";

	private static final int TITLE_MAX = 200;
	private static final int DESCRIPTION_MAX = 4000;
	private static final int VIDEO_URL_MAX = 2000;
	private static final int JOIN_URL_MAX = 2000;
	private static final int VENUE_MAX = 500;
	private static final int MAX_VISUALS = 20;
	private static final Set<String> TEMPORAL = Set.of("upcoming", "past");
	private static final Set<String> LOCATION_TYPES = Set.of("online", "in_person");
	private static final Set<String> COVER_TYPES = Set.of("photo", "video");

	private final EventRepository eventRepository;
	private final EventReportRepository reportRepository;
	private final EventVisualRepository visualRepository;
	private final UserRepository userRepository;
	private final EventCategoryService categoryService;
	private final DocumentUploadValidator documentUploadValidator;
	private final ImageUploadValidator imageUploadValidator;
	private final ObjectStorage objectStorage;
	private final WriteRateLimit writeRateLimit;
	private final ApplicationEventPublisher events;

	public EventService(
			EventRepository eventRepository,
			EventReportRepository reportRepository,
			EventVisualRepository visualRepository,
			UserRepository userRepository,
			EventCategoryService categoryService,
			DocumentUploadValidator documentUploadValidator,
			ImageUploadValidator imageUploadValidator,
			ObjectStorage objectStorage,
			WriteRateLimit writeRateLimit,
			ApplicationEventPublisher events) {
		this.eventRepository = eventRepository;
		this.reportRepository = reportRepository;
		this.visualRepository = visualRepository;
		this.userRepository = userRepository;
		this.categoryService = categoryService;
		this.documentUploadValidator = documentUploadValidator;
		this.imageUploadValidator = imageUploadValidator;
		this.objectStorage = objectStorage;
		this.writeRateLimit = writeRateLimit;
		this.events = events;
	}

	@Transactional(readOnly = true)
	public List<EventResponse> list(String category, String temporal, String search) {
		UUID categoryId = resolveCategoryFilter(category);
		String when = normalizeOptional(temporal);
		if (when != null && !TEMPORAL.contains(when)) {
			throw validation("status", "Statut invalide (upcoming, past).");
		}
		String q = search == null ? "" : search.trim();
		Instant now = Instant.now();
		return eventRepository.searchPublished("published", categoryId, when, now, q).stream()
				.map(e -> toResponse(e, now, false))
				.toList();
	}

	@Transactional(readOnly = true)
	public EventResponse get(UUID id) {
		return toResponse(requirePublished(id), Instant.now(), true);
	}

	@Transactional
	public EventResponse create(UUID actorId, JsonNode body) {
		return createFromParts(
				actorId,
				text(body, "title"),
				text(body, "categoryId").isBlank() ? text(body, "category") : text(body, "categoryId"),
				text(body, "description"),
				text(body, "locationType"),
				text(body, "joinUrl"),
				text(body, "venueAddress"),
				text(body, "startsAt"),
				text(body, "endsAt"),
				text(body, "coverType"),
				text(body, "videoUrl"),
				null);
	}

	@Transactional
	public EventResponse createMultipart(
			UUID actorId,
			String title,
			String categoryId,
			String description,
			String locationType,
			String joinUrl,
			String venueAddress,
			String startsAt,
			String endsAt,
			String coverType,
			String videoUrl,
			MultipartFile coverPhoto) {
		return createFromParts(
				actorId,
				title,
				categoryId,
				description,
				locationType,
				joinUrl,
				venueAddress,
				startsAt,
				endsAt,
				coverType,
				videoUrl,
				coverPhoto);
	}

	private EventResponse createFromParts(
			UUID actorId,
			String titleRaw,
			String categoryRaw,
			String descriptionRaw,
			String locationTypeRaw,
			String joinUrlRaw,
			String venueAddressRaw,
			String startsAtRaw,
			String endsAtRaw,
			String coverTypeRaw,
			String videoUrlRaw,
			MultipartFile coverPhoto) {
		User actor = requireAdmin(actorId);
		writeRateLimit.checkCreateEvent(actorId);

		String title = cleanText(titleRaw);
		if (title.isBlank()) {
			throw validation("title", "Le titre est obligatoire.");
		}
		if (title.length() > TITLE_MAX) {
			throw validation("title", "Le titre ne doit pas dépasser " + TITLE_MAX + " caractères.");
		}

		EventCategory category = categoryService.requireCategoryBySlugOrId(categoryRaw == null ? "" : categoryRaw);

		String description = cleanText(descriptionRaw);
		if (description.length() > DESCRIPTION_MAX) {
			throw validation(
					"description",
					"La description ne doit pas dépasser " + DESCRIPTION_MAX + " caractères.");
		}

		String locationType = normalizeOptional(locationTypeRaw);
		if (locationType == null) {
			locationType = "online";
		}
		if (!LOCATION_TYPES.contains(locationType)) {
			throw validation("locationType", "Type de lieu invalide (online, in_person).");
		}

		String joinUrl = cleanText(joinUrlRaw);
		String venueAddress = cleanText(venueAddressRaw);
		if ("online".equals(locationType)) {
			if (joinUrl.isBlank()) {
				throw validation("joinUrl", "Le lien de rejoindre est obligatoire pour un événement en ligne.");
			}
			if (joinUrl.length() > JOIN_URL_MAX) {
				throw validation("joinUrl", "Le lien est trop long.");
			}
			venueAddress = null;
		} else {
			if (venueAddress.isBlank()) {
				throw validation("venueAddress", "La localisation est obligatoire pour un événement présentiel.");
			}
			if (venueAddress.length() > VENUE_MAX) {
				throw validation("venueAddress", "La localisation est trop longue.");
			}
			joinUrl = null;
		}

		Instant startsAt = parseInstant(startsAtRaw, "startsAt", "La date de début est obligatoire.");
		Instant endsAt = parseInstant(endsAtRaw, "endsAt", "La date de fin est obligatoire.");
		if (endsAt.isBefore(startsAt)) {
			throw validation("endsAt", "La fin doit être postérieure ou égale au début.");
		}

		String coverType = normalizeOptional(coverTypeRaw);
		boolean hasPhoto = coverPhoto != null && !coverPhoto.isEmpty();
		boolean hasVideo = videoUrlRaw != null && !videoUrlRaw.isBlank();
		if (coverType == null) {
			if (hasPhoto) {
				coverType = "photo";
			} else if (hasVideo) {
				coverType = "video";
			}
		}
		if (coverType != null && !COVER_TYPES.contains(coverType)) {
			throw validation("coverType", "Type de couverture invalide (photo, video).");
		}

		Event event = new Event();
		event.setTitle(title);
		event.setSlug(uniqueSlug(title));
		event.setCategory(category);
		event.setDescription(description);
		event.setLocationType(locationType);
		event.setJoinUrl(joinUrl);
		event.setVenueAddress(venueAddress);
		event.setStartsAt(startsAt);
		event.setEndsAt(endsAt);
		event.setStatus("published");
		event.setCreatedBy(actor);

		if ("video".equals(coverType)) {
			if (!hasVideo) {
				throw validation("videoUrl", "L’URL vidéo de couverture est obligatoire.");
			}
			applyVideo(event, parseVideoRequired(videoUrlRaw));
			event.setCoverType("video");
			clearCoverPhoto(event);
		} else if ("photo".equals(coverType)) {
			if (!hasPhoto) {
				throw validation("coverPhoto", "La photo de couverture est obligatoire.");
			}
			applyVideo(event, null);
			event.setCoverType("photo");
			clearCoverPhoto(event);
		} else {
			applyVideo(event, null);
			event.setCoverType(null);
			clearCoverPhoto(event);
		}

		Event saved = eventRepository.save(event);
		if ("photo".equals(coverType)) {
			storeCoverPhoto(saved, coverPhoto);
			saved = eventRepository.save(saved);
		}
		EventResponse response = toResponse(saved, Instant.now());
		events.publishEvent(VisibleDataChanged.events());
		return response;
	}

	@Transactional
	public EventResponse patch(UUID id, UUID actorId, JsonNode body) {
		requireAdmin(actorId);
		Event event = eventRepository
				.findWithAuthor(id)
				.orElseThrow(() -> new AppException("not_found", "Événement introuvable.", HttpStatus.NOT_FOUND));
		if ("archived".equals(event.getStatus())) {
			throw new AppException("not_found", "Événement introuvable.", HttpStatus.NOT_FOUND);
		}

		if (body.has("title")) {
			String title = cleanText(body.get("title").asString(""));
			if (title.isBlank()) {
				throw validation("title", "Le titre est obligatoire.");
			}
			if (title.length() > TITLE_MAX) {
				throw validation("title", "Le titre ne doit pas dépasser " + TITLE_MAX + " caractères.");
			}
			event.setTitle(title);
		}
		if (body.has("categoryId") || body.has("category")) {
			String raw = body.has("categoryId")
					? body.get("categoryId").asString("")
					: body.get("category").asString("");
			event.setCategory(categoryService.requireCategoryBySlugOrId(raw));
		}
		if (body.has("description")) {
			String description = cleanText(body.get("description").asString(""));
			if (description.length() > DESCRIPTION_MAX) {
				throw validation(
						"description",
						"La description ne doit pas dépasser " + DESCRIPTION_MAX + " caractères.");
			}
			event.setDescription(description);
		}
		if (body.has("startsAt")) {
			event.setStartsAt(parseInstant(body.get("startsAt").asString(""), "startsAt", "Date de début invalide."));
		}
		if (body.has("endsAt")) {
			event.setEndsAt(parseInstant(body.get("endsAt").asString(""), "endsAt", "Date de fin invalide."));
		}
		if (event.getEndsAt().isBefore(event.getStartsAt())) {
			throw validation("endsAt", "La fin doit être postérieure ou égale au début.");
		}
		if (body.has("locationType") || body.has("joinUrl") || body.has("venueAddress")) {
			String locationType = body.has("locationType")
					? normalizeOptional(body.get("locationType").asString(""))
					: event.getLocationType();
			if (locationType == null || !LOCATION_TYPES.contains(locationType)) {
				throw validation("locationType", "Type de lieu invalide (online, in_person).");
			}
			event.setLocationType(locationType);
			if ("online".equals(locationType)) {
				String joinUrl = body.has("joinUrl")
						? cleanText(body.get("joinUrl").asString(""))
						: (event.getJoinUrl() == null ? "" : event.getJoinUrl());
				if (joinUrl.isBlank()) {
					throw validation("joinUrl", "Le lien de rejoindre est obligatoire pour un événement en ligne.");
				}
				if (joinUrl.length() > JOIN_URL_MAX) {
					throw validation("joinUrl", "Le lien est trop long.");
				}
				event.setJoinUrl(joinUrl);
				event.setVenueAddress(null);
			} else {
				String venue = body.has("venueAddress")
						? cleanText(body.get("venueAddress").asString(""))
						: (event.getVenueAddress() == null ? "" : event.getVenueAddress());
				if (venue.isBlank()) {
					throw validation("venueAddress", "La localisation est obligatoire pour un événement présentiel.");
				}
				if (venue.length() > VENUE_MAX) {
					throw validation("venueAddress", "La localisation est trop longue.");
				}
				event.setVenueAddress(venue);
				event.setJoinUrl(null);
			}
		}
		if (body.has("videoUrl")) {
			String raw = body.get("videoUrl").isNull() ? "" : body.get("videoUrl").asString("");
			if (raw.isBlank()) {
				applyVideo(event, null);
				if ("video".equals(event.getCoverType())) {
					event.setCoverType(null);
				}
			} else {
				applyVideo(event, parseVideoRequired(raw));
				event.setCoverType("video");
				deleteCoverPhotoFile(event);
				clearCoverPhoto(event);
			}
		}

		EventResponse response = toResponse(eventRepository.save(event), Instant.now());
		events.publishEvent(VisibleDataChanged.events());
		return response;
	}

	@Transactional
	public void delete(UUID id, UUID actorId) {
		requireAdmin(actorId);
		Event event = eventRepository
				.findById(id)
				.orElseThrow(() -> new AppException("not_found", "Événement introuvable.", HttpStatus.NOT_FOUND));

		EventReport report = reportRepository.findByEventId(id).orElse(null);
		List<EventVisual> visuals = visualRepository.findByEventIdOrderBySortOrderAscCreatedAtAsc(id);

		deleteCoverPhotoFile(event);
		if (report != null) {
			objectStorage.delete(report.getStorageBucket(), report.getStoragePath());
		}
		for (EventVisual visual : visuals) {
			objectStorage.delete(visual.getStorageBucket(), visual.getStoragePath());
		}

		eventRepository.delete(event);
		events.publishEvent(VisibleDataChanged.events());
	}

	@Transactional
	public EventResponse uploadReport(UUID eventId, UUID actorId, String titleRaw, MultipartFile file) {
		requireAdmin(actorId);
		Event event = requirePublished(eventId);
		var validated = documentUploadValidator.validate(file);

		EventReport existing = reportRepository.findByEventId(eventId).orElse(null);
		if (existing != null) {
			objectStorage.delete(existing.getStorageBucket(), existing.getStoragePath());
			reportRepository.delete(existing);
			reportRepository.flush();
		}

		String objectPath = eventId + "/report-" + UUID.randomUUID() + ".pdf";
		objectStorage.upload(BUCKET, objectPath, validated.bytes(), validated.contentType());

		EventReport report = new EventReport();
		report.setEvent(event);
		String title = cleanText(titleRaw);
		if (title.length() > TITLE_MAX) {
			title = title.substring(0, TITLE_MAX);
		}
		report.setTitle(title.isBlank() ? validated.originalFilename() : title);
		report.setStorageBucket(BUCKET);
		report.setStoragePath(objectPath);
		report.setOriginalFilename(validated.originalFilename());
		report.setMimeType(validated.contentType());
		report.setByteSize(validated.byteSize());
		reportRepository.save(report);

		events.publishEvent(VisibleDataChanged.events());
		return toResponse(event, Instant.now());
	}

	@Transactional
	public EventResponse deleteReport(UUID eventId, UUID actorId) {
		requireAdmin(actorId);
		Event event = requirePublished(eventId);
		EventReport report = reportRepository
				.findByEventId(eventId)
				.orElseThrow(() -> new AppException("not_found", "Rapport introuvable.", HttpStatus.NOT_FOUND));
		objectStorage.delete(report.getStorageBucket(), report.getStoragePath());
		reportRepository.delete(report);
		events.publishEvent(VisibleDataChanged.events());
		return toResponse(event, Instant.now());
	}

	@Transactional
	public EventResponse addVisuals(UUID eventId, UUID actorId, List<MultipartFile> files) {
		requireAdmin(actorId);
		Event event = requirePublished(eventId);
		List<MultipartFile> images = files == null
				? List.of()
				: files.stream().filter(f -> f != null && !f.isEmpty()).toList();
		if (images.isEmpty()) {
			throw validation("visuals", "Au moins une image est requise.");
		}
		int current = visualRepository.countByEventId(eventId);
		if (current + images.size() > MAX_VISUALS) {
			throw validation("visuals", "Maximum " + MAX_VISUALS + " visuels par événement.");
		}

		int order = current;
		for (MultipartFile file : images) {
			var validated = imageUploadValidator.validate(file);
			String objectPath = eventId + "/visual-" + UUID.randomUUID() + "." + validated.extension();
			objectStorage.upload(BUCKET, objectPath, validated.bytes(), validated.contentType());
			EventVisual visual = new EventVisual();
			visual.setEvent(event);
			visual.setStorageBucket(BUCKET);
			visual.setStoragePath(objectPath);
			visual.setOriginalFilename(safeFilename(file.getOriginalFilename(), "image." + validated.extension()));
			visual.setMimeType(validated.contentType());
			visual.setByteSize(validated.bytes().length);
			visual.setSortOrder(order++);
			visualRepository.save(visual);
		}

		events.publishEvent(VisibleDataChanged.events());
		return toResponse(event, Instant.now());
	}

	@Transactional
	public EventResponse deleteVisual(UUID eventId, UUID visualId, UUID actorId) {
		requireAdmin(actorId);
		Event event = requirePublished(eventId);
		EventVisual visual = visualRepository
				.findByIdAndEventId(visualId, eventId)
				.orElseThrow(() -> new AppException("not_found", "Visuel introuvable.", HttpStatus.NOT_FOUND));
		objectStorage.delete(visual.getStorageBucket(), visual.getStoragePath());
		visualRepository.delete(visual);
		events.publishEvent(VisibleDataChanged.events());
		return toResponse(event, Instant.now());
	}

	@Transactional(readOnly = true)
	public ResponseEntity<org.springframework.core.io.support.ResourceRegion> openCover(
			UUID id, HttpHeaders requestHeaders) {
		Event event = requirePublished(id);
		if (!"photo".equals(event.getCoverType())
				|| event.getCoverStoragePath() == null
				|| event.getCoverStoragePath().isBlank()) {
			throw new AppException("not_found", "Couverture introuvable.", HttpStatus.NOT_FOUND);
		}
		return openStored(
				event.getCoverStorageBucket(),
				event.getCoverStoragePath(),
				event.getCoverMimeType(),
				"cover.jpg",
				requestHeaders,
				false);
	}

	@Transactional(readOnly = true)
	public ResponseEntity<org.springframework.core.io.support.ResourceRegion> openReport(
			UUID id, HttpHeaders requestHeaders) {
		requirePublished(id);
		EventReport report = reportRepository
				.findByEventId(id)
				.orElseThrow(() -> new AppException("not_found", "Rapport introuvable.", HttpStatus.NOT_FOUND));
		return openStored(
				report.getStorageBucket(),
				report.getStoragePath(),
				report.getMimeType(),
				report.getOriginalFilename(),
				requestHeaders,
				true);
	}

	@Transactional(readOnly = true)
	public ResponseEntity<org.springframework.core.io.support.ResourceRegion> openVisual(
			UUID eventId, UUID visualId, HttpHeaders requestHeaders) {
		requirePublished(eventId);
		EventVisual visual = visualRepository
				.findByIdAndEventId(visualId, eventId)
				.orElseThrow(() -> new AppException("not_found", "Visuel introuvable.", HttpStatus.NOT_FOUND));
		return openStored(
				visual.getStorageBucket(),
				visual.getStoragePath(),
				visual.getMimeType(),
				visual.getOriginalFilename(),
				requestHeaders,
				false);
	}

	private ResponseEntity<org.springframework.core.io.support.ResourceRegion> openStored(
			String bucket,
			String path,
			String mimeType,
			String filename,
			HttpHeaders requestHeaders,
			boolean asPdfDisposition) {
		Resource file = objectStorage.openResource(bucket, path);
		long contentLength = resolveLength(0, file, bucket, path);
		MediaType mediaType = MediaTypeFactory.getMediaType(path)
				.orElseGet(() -> {
					if (mimeType != null && !mimeType.isBlank()) {
						return MediaType.parseMediaType(mimeType);
					}
					return MediaType.APPLICATION_OCTET_STREAM;
				});

		List<HttpRange> ranges = requestHeaders.getRange();
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(mediaType);
		headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
		headers.set(HttpHeaders.CACHE_CONTROL, "private, max-age=3600");
		headers.set("X-Content-Type-Options", "nosniff");
		if (asPdfDisposition) {
			headers.set(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(safeDownloadName(filename)));
		}
		headers.setContentLength(contentLength);

		if (ranges == null || ranges.isEmpty()) {
			return ResponseEntity.ok()
					.headers(headers)
					.body(new org.springframework.core.io.support.ResourceRegion(file, 0, contentLength));
		}
		HttpRange range = ranges.get(0);
		long start = range.getRangeStart(contentLength);
		long end = range.getRangeEnd(contentLength);
		long rangeLength = end - start + 1;
		headers.set(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + contentLength);
		headers.setContentLength(rangeLength);
		return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
				.headers(headers)
				.body(new org.springframework.core.io.support.ResourceRegion(file, start, rangeLength));
	}

	private void storeCoverPhoto(Event event, MultipartFile coverPhoto) {
		var validated = imageUploadValidator.validate(coverPhoto);
		String objectPath = event.getId() + "/cover." + validated.extension();
		objectStorage.upload(BUCKET, objectPath, validated.bytes(), validated.contentType());
		event.setCoverStorageBucket(BUCKET);
		event.setCoverStoragePath(objectPath);
		event.setCoverMimeType(validated.contentType());
	}

	private void clearCoverPhoto(Event event) {
		event.setCoverStorageBucket(null);
		event.setCoverStoragePath(null);
		event.setCoverMimeType(null);
	}

	private void deleteCoverPhotoFile(Event event) {
		if (event.getCoverStorageBucket() != null
				&& event.getCoverStoragePath() != null
				&& !event.getCoverStoragePath().isBlank()) {
			objectStorage.delete(event.getCoverStorageBucket(), event.getCoverStoragePath());
		}
	}

	private UUID resolveCategoryFilter(String category) {
		if (category == null || category.isBlank()) {
			return null;
		}
		return categoryService.requireCategoryBySlugOrId(category).getId();
	}

	private Event requirePublished(UUID id) {
		Event event = eventRepository
				.findWithAuthor(id)
				.orElseThrow(() -> new AppException("not_found", "Événement introuvable.", HttpStatus.NOT_FOUND));
		if (!"published".equals(event.getStatus())) {
			throw new AppException("not_found", "Événement introuvable.", HttpStatus.NOT_FOUND);
		}
		return event;
	}

	private User requireAdmin(UUID actorId) {
		User actor = userRepository
				.findById(actorId)
				.orElseThrow(() -> new AppException("unauthorized", "Authentification requise.", HttpStatus.UNAUTHORIZED));
		if (actor.isAccountDeleted() || !actor.isSiteAdmin()) {
			throw new AppException("forbidden", "Réservé aux administrateurs.", HttpStatus.FORBIDDEN);
		}
		return actor;
	}

	private EventResponse toResponse(Event event, Instant now) {
		return toResponse(event, now, true);
	}

	private EventResponse toResponse(Event event, Instant now, boolean includeAttachments) {
		User author = event.getCreatedBy();
		String authorName = author == null ? "" : (author.getDisplayName() == null ? "" : author.getDisplayName());
		EventCategory category = event.getCategory();
		Instant end = event.getEndsAt() != null ? event.getEndsAt() : event.getStartsAt();
		String temporal = end != null && !end.isBefore(now) ? "upcoming" : "past";
		String embedUrl = null;
		if (event.getVideoExternalId() != null && !event.getVideoExternalId().isBlank()) {
			if ("youtube".equals(event.getVideoProvider())) {
				embedUrl = "https://www.youtube.com/embed/" + event.getVideoExternalId();
			} else if ("drive".equals(event.getVideoProvider())) {
				embedUrl = "https://drive.google.com/file/d/" + event.getVideoExternalId() + "/preview";
			}
		}

		String coverUrl = null;
		if ("photo".equals(event.getCoverType())
				&& event.getCoverStoragePath() != null
				&& !event.getCoverStoragePath().isBlank()) {
			coverUrl = ApiPaths.api("/events/" + event.getId() + "/cover");
		}

		EventReportResponse reportResponse = null;
		List<EventVisualResponse> visuals = List.of();
		if (includeAttachments) {
			EventReport report = reportRepository.findByEventId(event.getId()).orElse(null);
			reportResponse = report == null
					? null
					: new EventReportResponse(
							report.getId().toString(),
							report.getTitle() == null ? "" : report.getTitle(),
							report.getOriginalFilename(),
							report.getMimeType(),
							report.getByteSize(),
							ApiPaths.api("/events/" + event.getId() + "/report"));

			visuals = new ArrayList<>();
			for (EventVisual visual : visualRepository.findByEventIdOrderBySortOrderAscCreatedAtAsc(event.getId())) {
				visuals.add(new EventVisualResponse(
						visual.getId().toString(),
						visual.getOriginalFilename(),
						visual.getMimeType(),
						visual.getByteSize(),
						visual.getSortOrder(),
						ApiPaths.api("/events/" + event.getId() + "/visuals/" + visual.getId())));
			}
		}

		return new EventResponse(
				event.getId().toString(),
				event.getTitle(),
				event.getSlug(),
				category == null ? null : category.getId().toString(),
				category == null ? "" : category.getSlug(),
				category == null ? "" : category.getName(),
				event.getDescription() == null ? "" : event.getDescription(),
				event.getStartsAt() == null ? null : event.getStartsAt().toString(),
				event.getEndsAt() == null ? null : event.getEndsAt().toString(),
				temporal,
				event.getLocationType() == null ? "online" : event.getLocationType(),
				event.getJoinUrl(),
				event.getVenueAddress(),
				event.getCoverType(),
				coverUrl,
				event.getVideoUrl(),
				event.getVideoProvider(),
				event.getVideoExternalId(),
				embedUrl,
				reportResponse,
				visuals,
				event.getStatus(),
				event.getCreatedAt() == null ? null : event.getCreatedAt().toString(),
				event.getUpdatedAt() == null ? null : event.getUpdatedAt().toString(),
				authorName);
	}

	private Instant parseInstant(String raw, String field, String blankMessage) {
		if (raw == null || raw.isBlank()) {
			throw validation(field, blankMessage);
		}
		try {
			return Instant.parse(raw.trim());
		} catch (Exception ex) {
			throw validation(field, "Date invalide (ISO-8601 attendu).");
		}
	}

	private ParsedVideo parseVideoRequired(String raw) {
		if (raw == null || raw.isBlank()) {
			throw validation("videoUrl", "L’URL vidéo est obligatoire.");
		}
		if (raw.trim().length() > VIDEO_URL_MAX) {
			throw validation("videoUrl", "L’URL vidéo est trop longue.");
		}
		try {
			return VideoLinkParser.parse(raw);
		} catch (IllegalArgumentException ex) {
			throw validation("videoUrl", ex.getMessage());
		}
	}

	private void applyVideo(Event event, ParsedVideo video) {
		if (video == null) {
			event.setVideoUrl(null);
			event.setVideoProvider(null);
			event.setVideoExternalId(null);
			return;
		}
		event.setVideoUrl(video.url());
		event.setVideoProvider(video.provider());
		event.setVideoExternalId(video.externalId());
	}

	private long resolveLength(long known, Resource file, String bucket, String path) {
		if (known > 0) {
			return known;
		}
		try {
			long len = file.contentLength();
			if (len >= 0) {
				return len;
			}
		} catch (Exception ignored) {
			/* fall through */
		}
		return objectStorage.size(bucket, path);
	}

	private String uniqueSlug(String title) {
		String base = title.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("^-+|-+$", "");
		if (base.isBlank()) {
			base = "event";
		}
		if (base.length() > 200) {
			base = base.substring(0, 200).replaceAll("-+$", "");
		}
		String slug = base;
		int i = 1;
		while (eventRepository.existsBySlug(slug)) {
			slug = base + "-" + i++;
		}
		return slug;
	}

	private static String text(JsonNode body, String field) {
		if (body == null || !body.has(field) || body.get(field).isNull()) {
			return "";
		}
		return body.get(field).asString("");
	}

	private static String normalizeOptional(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim().toLowerCase(Locale.ROOT);
	}

	private static String cleanText(String value) {
		if (value == null) {
			return "";
		}
		return value.replaceAll("<[^>]*>", "").trim();
	}

	private static String safeFilename(String raw, String fallback) {
		if (raw == null || raw.isBlank()) {
			return fallback;
		}
		return raw.replace("\"", "").replace("\r", "").replace("\n", "");
	}

	private static String safeDownloadName(String original) {
		if (original == null || original.isBlank()) {
			return "document.pdf";
		}
		return original.replace("\"", "").replace("\r", "").replace("\n", "");
	}

	private static String contentDisposition(String filename) {
		String ascii = filename.replaceAll("[^\\x20-\\x7E]", "_").replace("\"", "");
		if (ascii.isBlank()) {
			ascii = "document.pdf";
		}
		return "inline; filename=\"" + ascii + "\"";
	}

	private static AppException validation(String field, String message) {
		return new AppException(
				"validation_failed",
				"La requête contient des données invalides.",
				HttpStatus.UNPROCESSABLE_ENTITY,
				Map.of("fields", Map.of(field, message)));
	}
}
