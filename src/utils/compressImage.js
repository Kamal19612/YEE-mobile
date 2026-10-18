/**
 * Réduit les photos avant envoi chat/feed pour accélérer le chargement chez le destinataire.
 * Conserve le fichier d’origine si la compression échoue ou n’apporte rien.
 */
export async function compressImageForUpload(file, { maxEdge = 1600, quality = 0.82 } = {}) {
  if (!file || !file.type?.startsWith('image/')) return file
  // WebP/JPEG déjà petits : on recompresse toujours si trop larges en pixels.
  if (typeof createImageBitmap !== 'function' && typeof Image === 'undefined') return file

  try {
    const bitmap = await loadBitmap(file)
    const { width, height } = bitmap
    const longest = Math.max(width, height)
    const scale = longest > maxEdge ? maxEdge / longest : 1
    const tw = Math.max(1, Math.round(width * scale))
    const th = Math.max(1, Math.round(height * scale))

    // Déjà petit en pixels et < 400 Ko : inutile de recompresser.
    if (scale === 1 && file.size < 400 * 1024) {
      bitmap.close?.()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close?.()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, tw, th)
    bitmap.close?.()

    const outType = canvas.toDataURL('image/webp', 0.5).startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg'
    const blob = await canvasToBlob(canvas, outType, quality)
    if (!blob || blob.size === 0 || blob.size >= file.size * 0.98) {
      return file
    }
    const base = String(file.name || 'photo').replace(/\.[^.]+$/, '')
    const ext = outType === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `${base}.${ext}`, { type: outType, lastModified: Date.now() })
  } catch {
    return file
  }
}

export async function compressImagesForUpload(files, opts) {
  const list = Array.isArray(files) ? files : []
  return Promise.all(
    list.map((file) =>
      file?.type?.startsWith('image/') ? compressImageForUpload(file, opts) : Promise.resolve(file),
    ),
  )
}

function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image_load_failed'))
    }
    img.src = url
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}
