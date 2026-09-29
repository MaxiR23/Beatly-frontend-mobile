// INFO: the auth port: the access token, the sign operations and the session change events, in core's vocabulary.
export type AuthStatus = "signed_in" | "signed_out";

export interface AuthChange {
  readonly status: AuthStatus;
}

export type AuthFailureReason =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_already_exists"
  | "weak_password"
  | "invalid_email"
  | "rate_limited"
  | "link_invalid"
  | "unknown";

export interface AuthFailure {
  readonly kind: "failure";
  readonly reason: AuthFailureReason;
}

export type AuthResult = { readonly kind: "success" } | AuthFailure;

export type SignUpResult =
  { readonly kind: "signed_in" } | { readonly kind: "confirmation_sent" } | AuthFailure;

export interface SignInInput {
  readonly email: string;
  readonly password: string;
}

export interface SignUpInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export interface EmailLink {
  readonly tokenHash: string;
  readonly type: "signup" | "email";
}

export interface AuthPort {
  // null when signed out. Rejects only if the session cannot be read.
  getAccessToken(): Promise<string | null>;
  // The stored session, read without the network. Rejects only if the store cannot be read.
  getStatus(): Promise<AuthStatus>;
  // Returns the unsubscribe function.
  onAuthChange(listener: (change: AuthChange) => void): () => void;
  // The four operations below never reject: every failure, including a timeout, is an AuthFailure.
  signIn(input: SignInInput): Promise<AuthResult>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<AuthResult>;
  confirmEmail(link: EmailLink): Promise<AuthResult>;
}
