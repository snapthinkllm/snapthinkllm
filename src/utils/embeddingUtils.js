// utils/embeddingUtils.js
export const ensureEmbeddingModel = async (
  setDownloading, setStatus, setProgress, setDetail
) => {
  const modelName = 'nomic-embed-text:latest';
  const models = await window.chatAPI.getDownloadedModels();
  const isPresent = models.some(m => (typeof m === 'string' ? m : m.name) === modelName);
  if (isPresent) return;

  setDownloading(modelName);
  setStatus('starting');
  await window.chatAPI.downloadModel(modelName);
  setDownloading(null);
  setStatus(null);
  setProgress(null);
  setDetail(null);
};

export const getEmbedding = async (prompt) => {
  const res = await fetch('http://localhost:11434/api/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt }),
  });

  const data = await res.json();
  if (!data.embedding) throw new Error(`❌ No embedding returned for: ${prompt.slice(0, 30)}`);
  return data.embedding;
};

export const embedMultiple = async (prompts) => {
  const results = [];
  for (const prompt of prompts) {
    const embedding = await getEmbedding(prompt);
    results.push({ chunk: prompt, embedding });
  }
  return results;
};

export const cosineSimilarity = (vecA, vecB) => {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
};
