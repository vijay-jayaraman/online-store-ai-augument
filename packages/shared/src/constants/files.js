// Allowed upload types and maximum sizes (ADM-BK-05).
const MB = 1024 * 1024;

const PDF_TYPES = Object.freeze(['application/pdf']);

export const FILE_TYPES = Object.freeze({
  PDF: PDF_TYPES,
  SAMPLE: PDF_TYPES,
  COVER: Object.freeze(['image/jpeg', 'image/png', 'image/webp']),
});

// Sizes in bytes.
export const FILE_SIZE_LIMITS = Object.freeze({
  PDF: 100 * MB,
  SAMPLE: 20 * MB,
  COVER: 5 * MB,
});
