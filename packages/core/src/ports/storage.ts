// INFO: the storage port: small key-value data kept on the device, in core's vocabulary and with no library type.
export interface StoragePort {
  // null when the key has no value. Rejects only if the store cannot be read.
  get(key: string): Promise<string | null>;
  // Rejects only if the store cannot be written.
  set(key: string, value: string): Promise<void>;
  // Resolves when the key is gone, also when it had no value. Rejects only if the store cannot be written.
  delete(key: string): Promise<void>;
}
