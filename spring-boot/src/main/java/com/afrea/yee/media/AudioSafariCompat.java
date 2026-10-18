package com.afrea.yee.media;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Rend un audio compatible Safari / iOS.
 * WebM et Ogg (souvent Opus) sont refusés par Safari ; on les convertit en AAC (M4A)
 * quand {@code ffmpeg} est disponible. Sinon on laisse l’original (le front convertit
 * déjà WebM → WAV avant upload quand le navigateur source le permet).
 */
@Component
public class AudioSafariCompat {

	private static final Logger log = LoggerFactory.getLogger(AudioSafariCompat.class);
	private static final long TIMEOUT_SECONDS = 90;

	private final Boolean ffmpegAvailable;

	public AudioSafariCompat() {
		this.ffmpegAvailable = detectFfmpeg();
	}

	/** Visible pour les tests. */
	AudioSafariCompat(boolean ffmpegAvailable) {
		this.ffmpegAvailable = ffmpegAvailable;
	}

	public AudioUploadValidator.ValidatedAudio ensurePlayable(AudioUploadValidator.ValidatedAudio input) {
		if (input == null) {
			return null;
		}
		String mime = input.contentTypeNormalized();
		if (isSafariFriendly(mime)) {
			return input;
		}
		if (!Boolean.TRUE.equals(ffmpegAvailable)) {
			log.debug("ffmpeg absent — conservation du format {}", mime);
			return input;
		}
		try {
			return transcodeToAac(input);
		} catch (Exception ex) {
			log.warn("Transcodage audio échoué ({}): {}", mime, ex.toString());
			return input;
		}
	}

	public boolean isFfmpegAvailable() {
		return Boolean.TRUE.equals(ffmpegAvailable);
	}

	static boolean isSafariFriendly(String mime) {
		String m = mime == null ? "" : mime.toLowerCase(Locale.ROOT);
		return m.equals("audio/mpeg")
				|| m.equals("audio/mp4")
				|| m.equals("audio/aac")
				|| m.equals("audio/x-m4a")
				|| m.equals("audio/wav")
				|| m.equals("audio/wave")
				|| m.equals("audio/x-wav");
	}

	private AudioUploadValidator.ValidatedAudio transcodeToAac(AudioUploadValidator.ValidatedAudio input)
			throws IOException, InterruptedException {
		Path in = Files.createTempFile("yee-audio-in-", "." + input.extension());
		Path out = Files.createTempFile("yee-audio-out-", ".m4a");
		try {
			Files.write(in, input.bytes());
			ProcessBuilder pb = new ProcessBuilder(
					"ffmpeg",
					"-y",
					"-hide_banner",
					"-loglevel",
					"error",
					"-i",
					in.toAbsolutePath().toString(),
					"-vn",
					"-c:a",
					"aac",
					"-b:a",
					"128k",
					"-movflags",
					"+faststart",
					out.toAbsolutePath().toString());
			pb.redirectErrorStream(true);
			Process process = pb.start();
			String stderr = readLimited(process.getInputStream(), 4000);
			boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
			if (!finished) {
				process.destroyForcibly();
				throw new IOException("ffmpeg timeout");
			}
			if (process.exitValue() != 0) {
				throw new IOException("ffmpeg exit " + process.exitValue() + ": " + stderr);
			}
			byte[] bytes = Files.readAllBytes(out);
			if (bytes.length < 32) {
				throw new IOException("ffmpeg empty output");
			}
			return new AudioUploadValidator.ValidatedAudio(bytes, "audio/mp4", "m4a");
		} finally {
			Files.deleteIfExists(in);
			Files.deleteIfExists(out);
		}
	}

	private static Boolean detectFfmpeg() {
		try {
			ProcessBuilder pb = new ProcessBuilder("ffmpeg", "-version");
			pb.redirectErrorStream(true);
			Process process = pb.start();
			readLimited(process.getInputStream(), 512);
			boolean finished = process.waitFor(5, TimeUnit.SECONDS);
			if (!finished) {
				process.destroyForcibly();
				return false;
			}
			return process.exitValue() == 0;
		} catch (Exception ex) {
			return false;
		}
	}

	private static String readLimited(InputStream in, int max) throws IOException {
		byte[] buf = in.readNBytes(Math.max(1, max));
		return new String(buf);
	}
}
