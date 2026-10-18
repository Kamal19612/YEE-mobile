package com.afrea.yee.resources;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.ApiPaths;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.common.sync.VisibleDataChanged;
import com.afrea.yee.media.DocumentUploadValidator;
import com.afrea.yee.media.ObjectStorage;
import com.afrea.yee.media.PdfCoverGenerator;
import com.afrea.yee.media.StoredObject;
import com.afrea.yee.resources.dto.ResourceResponse;
import com.afrea.yee.resources.entity.LibraryCategory;
import com.afrea.yee.resources.entity.LibraryResource;
import com.afrea.yee.resources.repository.LibraryResourceRepository;
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
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaTypeFactory;
import tools.jackson.databind.JsonNode;

@Service
public class ResourceService {

	public static final String BUCKET = "library";

	private static final Set<String> LANGUAGES = Set.of("fr", "en", "ar", "pt");
	private static final int TITLE_MAX = 200;
	private static final int DESCRIPTION_MAX = 2000;

	private final LibraryResourceRepository resourceRepository;
	private final UserRepository userRepository;
	private final CategoryService categoryService;
	private final DocumentUploadValidator documentUploadValidator;
	private final PdfCoverGenerator pdfCoverGenerator;
	private final ObjectStorage objectStorage;
	private final WriteRateLimit writeRateLimit;
	private final ApplicationEventPublisher events;

	public ResourceService(
			LibraryResourceRepository resourceRepository,
			UserRepository userRepository,
			CategoryService categoryService,
			DocumentUploadValidator documentUploadValidator,
			PdfCoverGenerator pdfCoverGenerator,
			ObjectStorage objectStorage,
			WriteRateLimit writeRateLimit,
			ApplicationEventPublisher events) {
		this.resourceRepository = resourceRepository;
		this.userRepository = userRepository;
		this.categoryService = categoryService;
		this.documentUploadValidator = documentUploadValidator;
		this.pdfCoverGenerator = pdfCoverGenerator;
		this.objectStorage = objectStorage;
		this.writeRateLimit = writeRateLimit;
		this.events = events;
	}

	@Transactional(readOnly = true)
	public List<ResourceResponse> list(String category, String language, String search) {
		UUID categoryId = resolveCategoryFilter(category);
		String lang = normalizeOptional(language);
		if (lang != null && !LANGUAGES.contains(lang)) {
			throw validation("language", "Langue invalide.");
		}
		String q = search == null ? "" : search.trim();
		return resourceRepository.searchPublished("published", categoryId, lang, q).stream()
				.map(this::toResponse)
				.toList();
	}

	@Transactional(readOnly = true)
	public ResourceResponse get(UUID id) {
		LibraryResource resource = requirePublished(id);
		return toResponse(resource);
	}

	/**
	 * Sert le PDF avec {@code Accept-Ranges: bytes} pour un chargement progressif (pdf.js).
	 */
	@Transactional(readOnly = true)
	public ResponseEntity<org.springframework.core.io.support.ResourceRegion> openFile(
			UUID id, HttpHeaders requestHeaders) {
		LibraryResource resource = requirePublished(id);
		Resource file = objectStorage.openResource(resource.getStorageBucket(), resource.getStoragePath());
		long contentLength = resolveLength(resource.getByteSize(), file, resource.getStorageBucket(), resource.getStoragePath());
		String filename = safeDownloadName(resource.getOriginalFilename());

		List<HttpRange> ranges = requestHeaders.getRange();
		HttpHeaders headers = fileHeaders(MediaType.APPLICATION_PDF, filename, contentLength);

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

	/**
	 * Sert la couverture JPEG. Si absente (uploads pré-V26), la génère à la volée.
	 */
	@Transactional
	public ResponseEntity<org.springframework.core.io.support.ResourceRegion> openCover(
			UUID id, HttpHeaders requestHeaders) {
		LibraryResource resource = requirePublished(id);
		ensureCover(resource);
		String coverPath = resource.getCoverStoragePath();
		if (coverPath == null || coverPath.isBlank()) {
			throw new AppException("not_found", "Couverture introuvable.", HttpStatus.NOT_FOUND);
		}
		Resource file = objectStorage.openResource(resource.getStorageBucket(), coverPath);
		long contentLength = resolveLength(0, file, resource.getStorageBucket(), coverPath);
		MediaType mediaType = MediaTypeFactory.getMediaType(coverPath)
				.orElseGet(() -> {
					String mime = resource.getCoverMimeType();
					if (mime != null && !mime.isBlank()) {
						return MediaType.parseMediaType(mime);
					}
					return MediaType.IMAGE_JPEG;
				});

		List<HttpRange> ranges = requestHeaders.getRange();
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(mediaType);
		headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
		headers.set(HttpHeaders.CACHE_CONTROL, "private, max-age=86400");
		headers.set("X-Content-Type-Options", "nosniff");
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

	/** Génère et persiste une couverture si absente. */
	private void ensureCover(LibraryResource resource) {
		if (resource.getCoverStoragePath() != null && !resource.getCoverStoragePath().isBlank()) {
			return;
		}
		try {
			byte[] pdf = objectStorage.read(resource.getStorageBucket(), resource.getStoragePath());
			pdfCoverGenerator.fromPdf(pdf).ifPresent(cover -> {
				String stem = resource.getStoragePath().replaceAll("\\.pdf$", "");
				if (stem.equals(resource.getStoragePath()) || stem.isBlank()) {
					stem = resource.getId().toString();
				}
				String coverPath = stem + ".cover." + cover.extension();
				objectStorage.upload(resource.getStorageBucket(), coverPath, cover.bytes(), cover.contentType());
				resource.setCoverStoragePath(coverPath);
				resource.setCoverMimeType(cover.contentType());
				resourceRepository.save(resource);
			});
		} catch (RuntimeException ignored) {
			// best-effort
		}
	}

	@Transactional
	public ResourceResponse create(
			UUID actorId,
			String titleRaw,
			String categoryRaw,
			String languageRaw,
			String descriptionRaw,
			MultipartFile file) {
		User actor = requireAdmin(actorId);
		writeRateLimit.checkCreateResource(actorId);

		String title = cleanText(titleRaw);
		if (title.isBlank()) {
			throw validation("title", "Le titre est obligatoire.");
		}
		if (title.length() > TITLE_MAX) {
			throw validation("title", "Le titre ne doit pas dépasser " + TITLE_MAX + " caractères.");
		}

		LibraryCategory category = categoryService.requireCategoryBySlugOrId(categoryRaw);

		String language = normalizeRequired(languageRaw, "language");
		if (!LANGUAGES.contains(language)) {
			throw validation("language", "Langue invalide.");
		}

		String description = cleanText(descriptionRaw);
		if (description.length() > DESCRIPTION_MAX) {
			throw validation(
					"description",
					"La description ne doit pas dépasser " + DESCRIPTION_MAX + " caractères.");
		}

		DocumentUploadValidator.ValidatedDocument validated = documentUploadValidator.validate(file);
		String stem = UUID.randomUUID().toString();
		String objectPath = stem + ".pdf";
		StoredObject stored =
				objectStorage.upload(BUCKET, objectPath, validated.bytes(), validated.contentType());

		LibraryResource resource = new LibraryResource();
		resource.setTitle(title);
		resource.setSlug(uniqueSlug(title));
		resource.setCategory(category);
		resource.setLanguage(language);
		resource.setDescription(description);
		resource.setStorageBucket(stored.bucket());
		resource.setStoragePath(stored.path());
		resource.setOriginalFilename(validated.originalFilename());
		resource.setMimeType(validated.contentType());
		resource.setByteSize(validated.byteSize());
		resource.setStatus("published");
		resource.setCreatedBy(actor);

		pdfCoverGenerator.fromPdf(validated.bytes()).ifPresent(cover -> {
			String coverPath = stem + ".cover." + cover.extension();
			try {
				objectStorage.upload(BUCKET, coverPath, cover.bytes(), cover.contentType());
				resource.setCoverStoragePath(coverPath);
				resource.setCoverMimeType(cover.contentType());
			} catch (RuntimeException ex) {
				// Couverture optionnelle — le PDF reste publiable.
			}
		});

		ResourceResponse response = toResponse(resourceRepository.save(resource));
		events.publishEvent(VisibleDataChanged.resources());
		return response;
	}

	@Transactional
	public ResourceResponse patch(UUID id, UUID actorId, JsonNode body) {
		requireAdmin(actorId);
		LibraryResource resource = resourceRepository
				.findWithAuthor(id)
				.orElseThrow(() -> new AppException("not_found", "Ressource introuvable.", HttpStatus.NOT_FOUND));
		if ("archived".equals(resource.getStatus())) {
			throw new AppException("not_found", "Ressource introuvable.", HttpStatus.NOT_FOUND);
		}

		if (body.has("title")) {
			String title = cleanText(body.get("title").asString(""));
			if (title.isBlank()) {
				throw validation("title", "Le titre est obligatoire.");
			}
			if (title.length() > TITLE_MAX) {
				throw validation("title", "Le titre ne doit pas dépasser " + TITLE_MAX + " caractères.");
			}
			resource.setTitle(title);
		}
		if (body.has("categoryId") || body.has("category")) {
			String raw = body.has("categoryId")
					? body.get("categoryId").asString("")
					: body.get("category").asString("");
			resource.setCategory(categoryService.requireCategoryBySlugOrId(raw));
		}
		if (body.has("language")) {
			String language = normalizeRequired(body.get("language").asString(""), "language");
			if (!LANGUAGES.contains(language)) {
				throw validation("language", "Langue invalide.");
			}
			resource.setLanguage(language);
		}
		if (body.has("description")) {
			String description = cleanText(body.get("description").asString(""));
			if (description.length() > DESCRIPTION_MAX) {
				throw validation(
						"description",
						"La description ne doit pas dépasser " + DESCRIPTION_MAX + " caractères.");
			}
			resource.setDescription(description);
		}

		ResourceResponse response = toResponse(resourceRepository.save(resource));
		events.publishEvent(VisibleDataChanged.resources());
		return response;
	}

	@Transactional
	public void delete(UUID id, UUID actorId) {
		requireAdmin(actorId);
		LibraryResource resource = resourceRepository
				.findById(id)
				.orElseThrow(() -> new AppException("not_found", "Ressource introuvable.", HttpStatus.NOT_FOUND));
		String bucket = resource.getStorageBucket();
		String path = resource.getStoragePath();
		String coverPath = resource.getCoverStoragePath();
		resourceRepository.delete(resource);
		if (bucket != null && !bucket.isBlank() && path != null && !path.isBlank()) {
			objectStorage.delete(bucket, path);
		}
		if (bucket != null && !bucket.isBlank() && coverPath != null && !coverPath.isBlank()) {
			objectStorage.delete(bucket, coverPath);
		}
		events.publishEvent(VisibleDataChanged.resources());
	}

	private UUID resolveCategoryFilter(String category) {
		if (category == null || category.isBlank()) {
			return null;
		}
		return categoryService.requireCategoryBySlugOrId(category).getId();
	}

	private LibraryResource requirePublished(UUID id) {
		LibraryResource resource = resourceRepository
				.findWithAuthor(id)
				.orElseThrow(() -> new AppException("not_found", "Ressource introuvable.", HttpStatus.NOT_FOUND));
		if (!"published".equals(resource.getStatus())) {
			throw new AppException("not_found", "Ressource introuvable.", HttpStatus.NOT_FOUND);
		}
		return resource;
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

	private ResourceResponse toResponse(LibraryResource resource) {
		User author = resource.getCreatedBy();
		String authorName = author == null ? "" : (author.getDisplayName() == null ? "" : author.getDisplayName());
		LibraryCategory category = resource.getCategory();
		String coverUrl = ApiPaths.api("/resources/" + resource.getId() + "/cover");
		return new ResourceResponse(
				resource.getId().toString(),
				resource.getTitle(),
				resource.getSlug(),
				category == null ? null : category.getId().toString(),
				category == null ? "" : category.getSlug(),
				category == null ? "" : category.getName(),
				resource.getLanguage(),
				resource.getDescription() == null ? "" : resource.getDescription(),
				resource.getOriginalFilename(),
				resource.getMimeType(),
				ApiPaths.api("/resources/" + resource.getId() + "/file"),
				coverUrl,
				resource.getByteSize(),
				resource.getStatus(),
				resource.getCreatedAt() == null ? null : resource.getCreatedAt().toString(),
				resource.getUpdatedAt() == null ? null : resource.getUpdatedAt().toString(),
				authorName);
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

	private static HttpHeaders fileHeaders(MediaType contentType, String filename, long contentLength) {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(contentType);
		headers.set(HttpHeaders.CONTENT_DISPOSITION, contentDisposition(filename));
		headers.set(HttpHeaders.CACHE_CONTROL, "private, max-age=3600");
		headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
		headers.set("X-Content-Type-Options", "nosniff");
		headers.setContentLength(contentLength);
		return headers;
	}

	private String uniqueSlug(String title) {
		String base = title.toLowerCase(Locale.ROOT)
				.replaceAll("[^a-z0-9]+", "-")
				.replaceAll("^-+|-+$", "");
		if (base.isBlank()) {
			base = "resource";
		}
		if (base.length() > 200) {
			base = base.substring(0, 200).replaceAll("-+$", "");
		}
		String slug = base;
		int i = 1;
		while (resourceRepository.existsBySlug(slug)) {
			slug = base + "-" + i++;
		}
		return slug;
	}

	private static String normalizeOptional(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return value.trim().toLowerCase(Locale.ROOT);
	}

	private static String normalizeRequired(String value, String field) {
		String normalized = normalizeOptional(value);
		if (normalized == null) {
			throw validation(field, "Ce champ est obligatoire.");
		}
		return normalized;
	}

	private static String cleanText(String value) {
		if (value == null) {
			return "";
		}
		return value.replaceAll("<[^>]*>", "").trim();
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
