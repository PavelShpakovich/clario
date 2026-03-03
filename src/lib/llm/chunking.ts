/**
 * Utility for splitting long source text into overlapping chunks
 * Helps distribute card generation across multi-page documents
 */

export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Split long source text into overlapping chunks.
 *
 * @param text - The full source text to chunk
 * @param chunkSize - Target characters per chunk (default 6000)
 * @param overlapSize - Overlap between consecutive chunks (default 500)
 * @returns Array of text chunks with metadata
 *
 * @example
 * const chunks = chunkSourceText(longPdf, 6000, 500);
 * // Returns ~5 chunks from a 30KB PDF
 */
export function chunkSourceText(
  text: string,
  chunkSize: number = 6000,
  overlapSize: number = 500,
): TextChunk[] {
  if (!text || text.length === 0) {
    return [];
  }

  // If text is small, return as-is
  if (text.length <= chunkSize) {
    return [{ text, startIndex: 0, endIndex: text.length }];
  }

  const chunks: TextChunk[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const chunkEnd = Math.min(currentIndex + chunkSize, text.length);
    const chunkText = text.slice(currentIndex, chunkEnd);

    chunks.push({
      text: chunkText,
      startIndex: currentIndex,
      endIndex: chunkEnd,
    });

    // Move to next starting position, accounting for overlap
    currentIndex = Math.max(currentIndex + 1, chunkEnd - overlapSize);

    // If we've reached close to the end, break to avoid tiny final chunks
    if (text.length - currentIndex < chunkSize * 0.3) {
      break;
    }
  }

  return chunks;
}

/**
 * Distribute card count evenly across chunks.
 * Ensures every chunk gets at least 1 card (if count >= chunks.length).
 *
 * @param totalCount - Total cards to generate
 * @param chunkCount - Number of chunks
 * @returns Array of counts per chunk
 *
 * @example
 * distributeCount(10, 3) // => [4, 3, 3]
 * distributeCount(5, 10) // => [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
 */
export function distributeCount(totalCount: number, chunkCount: number): number[] {
  if (chunkCount === 0) return [];
  if (totalCount === 0) return Array(chunkCount).fill(0);

  const base = Math.floor(totalCount / chunkCount);
  const remainder = totalCount % chunkCount;

  return Array(chunkCount)
    .fill(base)
    .map((count, i) => (i < remainder ? count + 1 : count));
}
