import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // The `headers` arg (Cache-Control etc.) is intentionally ignored: with
        // next/headers cookies() there is no response object to attach them to,
        // and the proxy (src/proxy.ts) already applies them to every response
        // that refreshes the session cookies.
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component where cookies
            // cannot be set — safe to ignore in that context.
          }
        },
      },
    }
  );
}
