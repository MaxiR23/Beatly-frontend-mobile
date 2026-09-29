// INFO: splits values above the secure store's size limit into chunks; pure, no library import (ADR 007).
export interface SecureKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// Split by code point, never by UTF-16 unit, so a surrogate pair is never cut.
// 500 code points are at most 2000 UTF-8 bytes, under the store's per-value limit of 2048 bytes.
const CHUNK_CODE_POINTS = 500;

export function createChunkedStorage(store: SecureKeyValueStore): SecureKeyValueStore {
  const countKey = (key: string) => `${key}.count`;
  const chunkKey = (key: string, index: number) => `${key}.${String(index)}`;

  async function readCount(key: string): Promise<number | null> {
    const raw = await store.getItem(countKey(key));
    if (raw === null) return null;
    const count = Number.parseInt(raw, 10);
    return Number.isNaN(count) ? null : count;
  }

  return {
    async getItem(key) {
      const count = await readCount(key);
      if (count === null) return null;
      let value = "";
      for (let index = 0; index < count; index += 1) {
        const chunk = await store.getItem(chunkKey(key, index));
        if (chunk === null) return null;
        value += chunk;
      }
      return value;
    },
    async setItem(key, value) {
      const oldCount = (await readCount(key)) ?? 0;
      const points = Array.from(value);
      const chunks: string[] = [];
      for (let start = 0; start < points.length; start += CHUNK_CODE_POINTS) {
        chunks.push(points.slice(start, start + CHUNK_CODE_POINTS).join(""));
      }
      for (const [index, chunk] of chunks.entries()) {
        await store.setItem(chunkKey(key, index), chunk);
      }
      await store.setItem(countKey(key), String(chunks.length));
      for (let index = chunks.length; index < oldCount; index += 1) {
        await store.removeItem(chunkKey(key, index));
      }
    },
    async removeItem(key) {
      const count = (await readCount(key)) ?? 0;
      for (let index = 0; index < count; index += 1) {
        await store.removeItem(chunkKey(key, index));
      }
      await store.removeItem(countKey(key));
    },
  };
}
