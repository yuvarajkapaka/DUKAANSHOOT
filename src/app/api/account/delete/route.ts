import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Cloud accounts: delete all files and the auth user (rows cascade). */
export async function POST() {
  const { user, sb } = await currentUser();
  if (!user || !sb) return NextResponse.json({ error: "AUTH" }, { status: 401 });
  const admin = supabaseAdmin();
  if (!admin) return NextResponse.json({ error: "SERVER" }, { status: 500 });

  for (const bucket of ["uploads", "generated"]) {
    const { data } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
    if (data?.length) await admin.storage.from(bucket).remove(data.map((f) => `${user.id}/${f.name}`));
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "SERVER" }, { status: 500 });
  await sb.auth.signOut();
  return NextResponse.json({ ok: true });
}
