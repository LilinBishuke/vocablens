import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "招待コードを入力してください" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("invite_codes")
      .select("id, code, max_uses, used_count, expires_at")
      .eq("code", code.trim())
      .single();

    if (error || !data) {
      return NextResponse.json(
        { valid: false, error: "無効な招待コードです" },
        { status: 200 }
      );
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: "この招待コードは期限切れです" },
        { status: 200 }
      );
    }

    // Check usage limit
    if (data.used_count >= data.max_uses) {
      return NextResponse.json(
        { valid: false, error: "この招待コードは使用上限に達しました" },
        { status: 200 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json(
      { valid: false, error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
