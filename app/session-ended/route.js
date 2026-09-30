import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Reached when a still-valid cookie no longer maps to a usable account (workspace suspended, user
// removed). Clears the cookie so the sign-in page doesn't bounce straight back into the app.
export function GET(request) {
  const res = NextResponse.redirect(new URL("/login?ended=1", request.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
