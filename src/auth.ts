import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize the single Firebase App instance
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive Readonly API scope
provider.addScope("https://www.googleapis.com/auth/drive.readonly");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

const getPersistedToken = (): string | null => {
  const item = localStorage.getItem("google_drive_access_token_v2");
  if (!item) return null;
  try {
    const parsed = JSON.parse(item);
    // Tokens expire after 1 hour (3600s), check within 55 min buffer
    if (Date.now() - parsed.timestamp < 55 * 60 * 1000) {
      return parsed.token;
    }
  } catch (e) {
    console.error("Error parsing persisted token:", e);
  }
  return null;
};

const persistToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(
      "google_drive_access_token_v2",
      JSON.stringify({ token, timestamp: Date.now() })
    );
  } else {
    localStorage.removeItem("google_drive_access_token_v2");
  }
};

/**
 * Initialize auth state listener. Call this on app load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const activeToken = cachedAccessToken || getPersistedToken();
      if (activeToken) {
        cachedAccessToken = activeToken;
        persistToken(activeToken);
        if (onAuthSuccess) onAuthSuccess(user, activeToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      persistToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Handle popup sign-in with Google to obtain authorized token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    persistToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || getPersistedToken();
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  persistToken(null);
};
