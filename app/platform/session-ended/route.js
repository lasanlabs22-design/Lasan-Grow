import { NextResponse } from "next/server";
import { PLATFORM_COOKIE, platformCookieOptions } from "@/lib/session";

// Reached when a console cookie still verifies but its account can't be used any more (deactivated,
// password or role changed elsewhere). Clears it so the sign-in page doesn't bounce back.
export function GET(request) {
  const res = NextResponse.redirect(new URL("/platform/login", request.url));
  res.cookies.delete({ name: PLATFORM_COOKIE, path: platformCookieOptions.path });
  return res;
}
