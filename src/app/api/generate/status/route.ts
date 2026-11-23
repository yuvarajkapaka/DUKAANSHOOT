import { NextResponse } from "next/server";
import { getProvider, mockProvider } from "@/lib/providers";
import { parseGarmentType, parseLook } from "@/lib/server/validate";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Poll a job (the browser calls this every 2 s).
 * POST so the browser can also send what it asked for — needed to restart the
 * job on the demo provider if the real AI fails mid-way.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const jobId = typeof body?.jobId === "string" ? body.jobId : "";
  if (!jobId || jobId.length > 4000) return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });

  let status;
  try {
    status = await getProvider().getStatus(jobId);
  } catch (e) {
    console.warn("[status] provider unreachable", (e as Error).message);
    return NextResponse.json({ error: "RETRY" }, { status: 503 });
  }

  // Real AI failed and demo fallback is on: restart as a demo job, the browser swaps the job id.
  if (status.status === "failed" && status.error === "FALLBACK") {
    const garmentType = parseGarmentType(body.garmentType);
    const look = parseLook(body.look);
    if (garmentType && look) {
      const { jobId: newJobId } = await mockProvider.generate(
        {
          garmentImageUrl: "",
          garmentType,
          model: look,
          background: look.background,
          count: Number(body.count) || 4,
          variants: Array.isArray(body.variants) ? body.variants : undefined,
        },
        "fallback",
      );
      return NextResponse.json({ status: "running", progress: 60, jobId: newJobId });
    }
    status = { status: "failed" as const, error: "AI failed" };
  }

  // Cloud accounts: record completion, refund credits on failure (once, in Postgres).
  let refunded = false;
  const generationId = typeof body.generationId === "string" ? body.generationId : null;
  if (generationId && (status.status === "done" || status.status === "failed")) {
    const { user, sb } = await currentUser();
    if (user && sb) {
      const { data: own } = await sb.from("generations").select("id").eq("id", generationId).maybeSingle();
      if (own) {
        await supabaseAdmin()?.rpc("finish_generation", {
          p_generation_id: generationId,
          p_ok: status.status === "done",
          p_error: status.error ?? null,
        });
        refunded = status.status === "failed";
      }
    }
  }

  return NextResponse.json({ ...status, refunded });
}
