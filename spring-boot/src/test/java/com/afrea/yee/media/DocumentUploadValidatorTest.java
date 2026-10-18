package com.afrea.yee.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.afrea.yee.common.exception.AppException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class DocumentUploadValidatorTest {

	private final DocumentUploadValidator validator = new DocumentUploadValidator();

	@Test
	void acceptsPdfMagicBytes() {
		byte[] pdf = "%PDF-1.4 minimal".getBytes();
		MockMultipartFile file = new MockMultipartFile("document", "rapport.pdf", "application/pdf", pdf);
		DocumentUploadValidator.ValidatedDocument validated = validator.validate(file);
		assertThat(validated.contentType()).isEqualTo("application/pdf");
		assertThat(validated.extension()).isEqualTo("pdf");
		assertThat(validated.originalFilename()).isEqualTo("rapport.pdf");
		assertThat(validated.byteSize()).isEqualTo(pdf.length);
	}

	@Test
	void rejectsNonPdf() {
		MockMultipartFile file = new MockMultipartFile(
				"document", "notes.docx", "application/pdf", "PK\u0003\u0004fake".getBytes());
		assertThatThrownBy(() -> validator.validate(file))
				.isInstanceOf(AppException.class)
				.extracting(ex -> ((AppException) ex).getCode())
				.isEqualTo("invalid_file_type");
	}

	@Test
	void sanitizesDangerousFilename() {
		byte[] pdf = "%PDF-1.7".getBytes();
		MockMultipartFile file = new MockMultipartFile(
				"document", "../evil<script>.PDF", "application/pdf", pdf);
		DocumentUploadValidator.ValidatedDocument validated = validator.validate(file);
		assertThat(validated.originalFilename()).doesNotContain("..");
		assertThat(validated.originalFilename()).doesNotContain("<");
		assertThat(validated.originalFilename().toLowerCase()).endsWith(".pdf");
	}

	@Test
	void detectsPdfHeader() {
		assertThat(DocumentUploadValidator.isPdf("%PDF-1.4".getBytes())).isTrue();
		assertThat(DocumentUploadValidator.isPdf("not-pdf".getBytes())).isFalse();
	}
}
