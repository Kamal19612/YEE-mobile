package com.afrea.yee.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.afrea.yee.common.config.AppProperties;
import com.afrea.yee.common.exception.AppException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;

class LocalObjectStorageReadTest {

	@TempDir
	Path root;

	@Test
	void readsFileInsideBucket() throws Exception {
		Path file = root.resolve("chat-media").resolve("conv").resolve("a.png");
		Files.createDirectories(file.getParent());
		Files.write(file, new byte[] { 1, 2, 3 });

		LocalObjectStorage storage = storage();
		assertThat(storage.read("chat-media", "conv/a.png")).containsExactly(1, 2, 3);
	}

	@Test
	void rejectsPathEscape() {
		LocalObjectStorage storage = storage();
		assertThatThrownBy(() -> storage.read("chat-media", "../secret.txt"))
				.isInstanceOf(AppException.class)
				.satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
	}

	private LocalObjectStorage storage() {
		AppProperties properties = new AppProperties();
		properties.getStorage().setLocalRoot(root.toString());
		return new LocalObjectStorage(properties);
	}
}
