// INFO: races a promise against a timer that resolves a fallback; pure, so a hung auth call reaches an error state.
export function withTimeout<T>(work: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      // A late rejection of the abandoned work must not surface as unhandled.
      work.catch(() => undefined);
      resolve(onTimeout);
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("auth operation failed"));
      },
    );
  });
}
