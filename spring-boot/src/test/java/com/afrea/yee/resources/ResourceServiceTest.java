package com.afrea.yee.resources;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.afrea.yee.auth.entity.User;
import com.afrea.yee.auth.repository.UserRepository;
import com.afrea.yee.common.exception.AppException;
import com.afrea.yee.common.ratelimit.WriteRateLimit;
import com.afrea.yee.media.DocumentUploadValidator;
import com.afrea.yee.media.ObjectStorage;
import com.afrea.yee.media.PdfCoverGenerator;
import com.afrea.yee.media.StoredObject;
import com.afrea.yee.resources.dto.ResourceResponse;
import com.afrea.yee.resources.entity.LibraryCategory;
import com.afrea.yee.resources.entity.LibraryResource;
import com.afrea.yee.resources.repository.LibraryResourceRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

	@Mock
	LibraryResourceRepository resourceRepository;
	@Mock
	UserRepository userRepository;
	@Mock
	CategoryService categoryService;
	@Mock
	DocumentUploadValidator documentUploadValidator;
	@Mock
	PdfCoverGenerator pdfCoverGenerator;
	@Mock
	ObjectStorage objectStorage;
	@Mock
	WriteRateLimit writeRateLimit;
	@Mock
	ApplicationEventPublisher events;

	ResourceService service;

	@BeforeEach
	void setUp() {
		service = new ResourceService(
				resourceRepository,
				userRepository,
				categoryService,
				documentUploadValidator,
				pdfCoverGenerator,
				objectStorage,
				writeRateLimit,
				events);
	}

	@Test
	void create_rejectsNonAdmin() {
		UUID actorId = UUID.randomUUID();
		User user = new User();
		user.setSiteAdmin(false);
		when(userRepository.findById(actorId)).thenReturn(Optional.of(user));

		AppException ex = assertThrows(
				AppException.class,
				() -> service.create(
						actorId,
						"Guide",
						"guides",
						"fr",
						"",
						new MockMultipartFile("file", "a.pdf", "application/pdf", "%PDF-".getBytes())));
		assertEquals("forbidden", ex.getCode());
		assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
	}

	@Test
	void create_storesPdfAndOptionalCover() throws Exception {
		UUID actorId = UUID.randomUUID();
		User admin = new User();
		admin.setSiteAdmin(true);
		admin.setDisplayName("Admin");
		when(userRepository.findById(actorId)).thenReturn(Optional.of(admin));
		when(resourceRepository.existsBySlug(any())).thenReturn(false);

		LibraryCategory category = new LibraryCategory();
		var catIdField = LibraryCategory.class.getDeclaredField("id");
		catIdField.setAccessible(true);
		catIdField.set(category, UUID.randomUUID());
		category.setSlug("guides");
		category.setName("Guides");
		when(categoryService.requireCategoryBySlugOrId("guides")).thenReturn(category);

		byte[] pdf = "%PDF-1.4 demo".getBytes();
		MockMultipartFile file = new MockMultipartFile("file", "guide.pdf", "application/pdf", pdf);
		when(documentUploadValidator.validate(file))
				.thenReturn(new DocumentUploadValidator.ValidatedDocument(
						pdf, "application/pdf", "pdf", "guide.pdf", pdf.length));
		when(objectStorage.upload(eq(ResourceService.BUCKET), any(), eq(pdf), eq("application/pdf")))
				.thenReturn(new StoredObject(ResourceService.BUCKET, "x.pdf", "/media/library/x.pdf"));
		when(pdfCoverGenerator.fromPdf(pdf)).thenReturn(Optional.empty());
		when(resourceRepository.save(any(LibraryResource.class))).thenAnswer(inv -> {
			LibraryResource saved = inv.getArgument(0);
			var idField = LibraryResource.class.getDeclaredField("id");
			idField.setAccessible(true);
			idField.set(saved, UUID.randomUUID());
			var createdField = LibraryResource.class.getDeclaredField("createdAt");
			createdField.setAccessible(true);
			createdField.set(saved, java.time.Instant.parse("2026-10-06T00:00:00Z"));
			var updatedField = LibraryResource.class.getDeclaredField("updatedAt");
			updatedField.setAccessible(true);
			updatedField.set(saved, java.time.Instant.parse("2026-10-06T00:00:00Z"));
			return saved;
		});

		ResourceResponse response = service.create(actorId, "Guide YEE", "guides", "fr", "Desc", file);

		assertEquals("Guide YEE", response.title());
		assertEquals("guides", response.categorySlug());
		assertEquals("Guides", response.categoryName());
		assertEquals("fr", response.language());
		assertEquals("guide.pdf", response.originalFilename());
		assertEquals("Admin", response.createdByName());
		assertEquals(pdf.length, response.byteSize());
		assertEquals("/resources/" + response.id() + "/cover", response.coverUrl());

		ArgumentCaptor<LibraryResource> captor = ArgumentCaptor.forClass(LibraryResource.class);
		verify(resourceRepository).save(captor.capture());
		assertEquals(pdf.length, captor.getValue().getByteSize());
	}
}
