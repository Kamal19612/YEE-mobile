package com.afrea.yee.media;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Rasterise la page 1 d’un PDF en JPEG léger pour les listes mobiles.
 * Échec soft : l’upload du PDF reste valide sans couverture.
 */
@Component
public class PdfCoverGenerator {

	private static final Logger log = LoggerFactory.getLogger(PdfCoverGenerator.class);

	private static final float RENDER_DPI = 120f;
	private static final int MAX_WIDTH = 800;
	private static final float JPEG_QUALITY = 0.82f;

	public record CoverImage(byte[] bytes, String contentType, String extension) {}

	public Optional<CoverImage> fromPdf(byte[] pdfBytes) {
		if (pdfBytes == null || pdfBytes.length < 5) {
			return Optional.empty();
		}
		try (PDDocument document = Loader.loadPDF(pdfBytes)) {
			if (document.getNumberOfPages() < 1) {
				return Optional.empty();
			}
			if (document.isEncrypted()) {
				try {
					document.setAllSecurityToBeRemoved(true);
				} catch (Exception ex) {
					log.debug("PDF chiffré — couverture ignorée");
					return Optional.empty();
				}
			}
			PDFRenderer renderer = new PDFRenderer(document);
			BufferedImage rendered = renderer.renderImageWithDPI(0, RENDER_DPI, ImageType.RGB);
			BufferedImage scaled = scaleToMaxWidth(rendered, MAX_WIDTH);
			byte[] jpeg = encodeJpeg(scaled);
			if (jpeg.length == 0) {
				return Optional.empty();
			}
			return Optional.of(new CoverImage(jpeg, "image/jpeg", "jpg"));
		} catch (Exception ex) {
			log.warn("Génération couverture PDF échouée : {}", ex.toString());
			return Optional.empty();
		}
	}

	private static BufferedImage scaleToMaxWidth(BufferedImage source, int maxWidth) {
		if (source.getWidth() <= maxWidth) {
			return source;
		}
		int width = maxWidth;
		int height = Math.max(1, (int) Math.round(source.getHeight() * (maxWidth / (double) source.getWidth())));
		BufferedImage out = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
		Graphics2D g = out.createGraphics();
		try {
			g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
			g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
			g.drawImage(source, 0, 0, width, height, null);
		} finally {
			g.dispose();
		}
		return out;
	}

	private static byte[] encodeJpeg(BufferedImage image) throws Exception {
		BufferedImage rgb = image;
		if (image.getType() != BufferedImage.TYPE_INT_RGB) {
			rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
			Graphics2D g = rgb.createGraphics();
			try {
				g.drawImage(image, 0, 0, null);
			} finally {
				g.dispose();
			}
		}
		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		var writers = ImageIO.getImageWritersByFormatName("jpg");
		if (!writers.hasNext()) {
			ImageIO.write(rgb, "jpg", baos);
			return baos.toByteArray();
		}
		var writer = writers.next();
		try (var ios = ImageIO.createImageOutputStream(baos)) {
			writer.setOutput(ios);
			var param = writer.getDefaultWriteParam();
			if (param.canWriteCompressed()) {
				param.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
				param.setCompressionQuality(JPEG_QUALITY);
			}
			writer.write(null, new javax.imageio.IIOImage(rgb, null, null), param);
		} finally {
			writer.dispose();
		}
		return baos.toByteArray();
	}
}
