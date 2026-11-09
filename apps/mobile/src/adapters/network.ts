// INFO: the only importer of @react-native-community/netinfo; reports whether the device is connected and the internet reachable; no port because core never reads connectivity (the query layer's onlineManager does). On iOS the library runs its own reachability probe to its default URL, a third-party host, so offline means only that the phone has no internet and a backend outage stays a server failure (ADR 036).
import NetInfo from "@react-native-community/netinfo";

// Returns the library's unsubscribe. null is not known yet and counts as online; a network without internet counts as offline.
export function subscribeToConnection(listener: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => {
    listener(state.isConnected !== false && state.isInternetReachable !== false);
  });
}
