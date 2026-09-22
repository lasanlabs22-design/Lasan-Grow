import { SignJWT, jwtVerify } from "jose";

// Edge-safe session helpers (used by proxy.js and server code alike).

export const SESSION_COOKIE = "lg_session";
const MAX_AGE_DAYS = 30;

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

export async function signSession({ userId, orgId }) {
  return new SignJWT({ uid: userId, oid: orgId })
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
    return { userId: payload.uid, orgId: payload.oid };
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
