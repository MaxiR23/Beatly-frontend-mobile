// INFO: the auth port: the access token and the session change events, in core's vocabulary.
export interface AuthChange {
  readonly status: "signed_in" | "signed_out";
}

export interface AuthPort {
  // null when signed out. Rejects only if the session cannot be read.
  getAccessToken(): Promise<string | null>;
  // Returns the unsubscribe function.
  onAuthChange(listener: (change: AuthChange) => void): () => void;
}
