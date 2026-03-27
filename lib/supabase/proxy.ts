import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

// Cookie-based cache for member status to avoid DB query on every request.
// The cookie stores "active" | "disabled" | "invited" and the user_id it was
// verified against. It's refreshed every 5 minutes or on mismatch.
const MEMBER_COOKIE = "fs_member_status";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type MemberCache = { status: string; uid: string; ts: number };

function parseMemberCache(raw: string | undefined): MemberCache | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.uid && parsed.status && parsed.ts) return parsed as MemberCache;
  } catch {}
  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (
    request.nextUrl.pathname !== "/" &&
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // ── Member activation + disabled-user gate ─────────────────────────────
  // Runs only on app routes (not auth, not landing page)
  const isAppRoute =
    user &&
    request.nextUrl.pathname !== "/" &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/login");

  if (isAppRoute) {
    const userId = user.sub as string;

    // Check cookie cache first — skip DB if still fresh and for same user
    const cached = parseMemberCache(
      request.cookies.get(MEMBER_COOKIE)?.value
    );
    const cacheValid =
      cached &&
      cached.uid === userId &&
      Date.now() - cached.ts < CACHE_TTL_MS &&
      cached.status === "active";

    if (cacheValid) {
      // Cache hit — skip member lookup entirely
      return supabaseResponse;
    }

    // Cache miss or stale — do the DB lookup
    const { data: member } = await supabase
      .from("members")
      .select("id, user_id, status, role")
      .eq("user_id", userId)
      .single();

    if (member) {
      if (member.status === "disabled") {
        // Clear cache cookie
        supabaseResponse.cookies.delete(MEMBER_COOKIE);
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set("error", "Your account has been disabled.");
        return NextResponse.redirect(url);
      }
      // Active member — set cache cookie and let through
      supabaseResponse.cookies.set(
        MEMBER_COOKIE,
        JSON.stringify({ status: member.status, uid: userId, ts: Date.now() }),
        { path: "/", httpOnly: true, sameSite: "lax", maxAge: 300 }
      );
    } else {
      // No member by user_id — check for invited row by email
      const userEmail = user.email as string;
      const { data: invitedMember } = await supabase
        .from("members")
        .select("id, status")
        .eq("email", userEmail)
        .eq("status", "invited")
        .single();

      if (invitedMember) {
        // Activate: set user_id and status
        await supabase
          .from("members")
          .update({ user_id: userId, status: "active" })
          .eq("id", invitedMember.id);
        // Set cache after activation
        supabaseResponse.cookies.set(
          MEMBER_COOKIE,
          JSON.stringify({ status: "active", uid: userId, ts: Date.now() }),
          { path: "/", httpOnly: true, sameSite: "lax", maxAge: 300 }
        );
      } else {
        // Not a member at all — block access
        supabaseResponse.cookies.delete(MEMBER_COOKIE);
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        url.searchParams.set(
          "error",
          "You are not a member of this workspace."
        );
        return NextResponse.redirect(url);
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse;
}
