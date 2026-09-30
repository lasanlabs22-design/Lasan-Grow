import { SignJWT, jwtVerify } from "jose";

// Edge-safe session helpers (used by proxy.js and server code alike).
// Two kinds of session share the signing secret but never each other's cookie or claims: workspace
// users (lg_session) and Lasan staff in the platform console (lg_platform, typ "platform").

export const SESSION_COOKIE = "lg_session";
export const PLATFORM_COOKIE = "lg_platform";
const MAX_AGE_DAYS = 30;
const PLATFORM_MAX_AGE_HOURS = 12;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is not set");
    }
    return new TextEncoder().encode("lasan-grow-dev-secret-do-not-use-in-prod");
  }
  return new TextEncoder().encode(secret);
}

// `tv` is the user's token version: bumping it in the database signs out every older session.
export async function signSession({ userId, orgId, tokenVersion = 0 }) {
  return new SignJWT({ uid: userId, oid: orgId, tv: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(secretKey());
}

export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.typ || typeof payload.uid !== "string" || typeof payload.oid !== "string") return null;
    // Sessions from before token versions existed count as version 0.
    return { userId: payload.uid, orgId: payload.oid, tokenVersion: typeof payload.tv === "number" ? payload.tv : 0 };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
};

// `tv` is the admin's token version: bumping it in the database signs them out everywhere.
export async function signPlatformSession({ adminId, tokenVersion }) {
  return new SignJWT({ typ: "platform", pid: adminId, tv: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PLATFORM_MAX_AGE_HOURS}h`)
    .sign(secretKey());
}

export async function verifyPlatformSession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.typ !== "platform" || typeof payload.pid !== "string" || typeof payload.tv !== "number") return null;
    return { adminId: payload.pid, tokenVersion: payload.tv };
  } catch {
    return null;
  }
}

// Scoped to the console's paths, and shorter-lived than a workspace session.
export const platformCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/platform",
  maxAge: PLATFORM_MAX_AGE_HOURS * 60 * 60,
};
