export function chunkText(text, maxTokens = 300, overlap = 50) {
  console.time('Chunking time');
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += maxTokens - overlap) {
    const chunkWords = words.slice(i, i + maxTokens);
    const chunk = chunkWords.join(' ');
    if (chunk.trim()) {
      chunks.push(chunk);
    }
  }
  console.timeEnd('Chunking time');
  return chunks;
}