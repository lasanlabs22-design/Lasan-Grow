import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { tenantDb, schema } from "@/lib/db";

// A teammate's profile photo, served as an image so pages can lazy-load it with <img>. Only people
// signed in to the same workspace get it: the lookup runs under row-level security, so another
// workspace's user id finds nothing.
export async function GET(_request, ctx) {
  const current = await getCurrentUser();
  if (!current) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const db = await tenantDb(current.org.id);
  const [row] = await db
    .select({ data: schema.userPhotos.data })
    .from(schema.userPhotos)
    .where(eq(schema.userPhotos.userId, id))
    .limit(1);
  const match = row?.data.match(/^data:(image\/[a-z]+);base64,(.*)$/);
  if (!match) return new Response("Not found", { status: 404 });

  // Links carry ?v= that changes with the photo, so a private cache is safe and keeps lists fast.
  return new Response(Buffer.from(match[2], "base64"), {
    headers: { "content-type": match[1], "cache-control": "private, max-age=86400" },
  });
}
