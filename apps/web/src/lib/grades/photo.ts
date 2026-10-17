/** Resize before upload and strip EXIF/location metadata by re-encoding the image. */
export async function prepareReportPhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size > 25 * 1024 * 1024)
    throw new Error('Choose a photo under 25 MB.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode().catch(() => {
      throw new Error('This photo format could not be opened. Try a JPG or PNG export.')
    })
    const scale = Math.min(1, 2200 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to prepare this photo.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.88),
    )
    if (!blob || blob.size > 3 * 1024 * 1024)
      throw new Error('Please crop the photo and try again. Prepared photos must be under 3 MB.')
    return new File([blob], 'report-card.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
