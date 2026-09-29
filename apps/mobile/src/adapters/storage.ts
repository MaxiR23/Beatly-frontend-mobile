// INFO: the storage adapter: the only importer of the key-value store library; implements the storage port.
import type { StoragePort } from "@beatly/core";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function createStorageAdapter(): StoragePort {
  return {
    get: (key) => AsyncStorage.getItem(key),
    set: (key, value) => AsyncStorage.setItem(key, value),
    delete: (key) => AsyncStorage.removeItem(key),
  };
}
