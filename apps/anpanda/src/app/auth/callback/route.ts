import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteCode = searchParams.get("invite_code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Create profile if first login
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existingProfile) {
          await supabase.from("profiles").insert({
            id: user.id,
            display_name:
              user.user_metadata?.full_name ?? user.email?.split("@")[0],
            avatar_url: user.user_metadata?.avatar_url,
            invite_code: inviteCode ?? "unknown",
          });

          // Create default settings
          await supabase.from("user_settings").insert({
            user_id: user.id,
          });

          // Increment invite code usage
          if (inviteCode) {
            await supabase.rpc("increment_invite_usage", {
              invite_code_value: inviteCode,
            });
          }
        }
      }

      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Auth error → redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
