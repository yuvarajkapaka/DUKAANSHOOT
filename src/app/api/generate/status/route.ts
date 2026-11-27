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
  const generationId = typeof body.generationId === "string" ? body.generationId : null;

  /*
   * Cloud accounts: the generation row records which AI job its credits paid for, and
   * only that job may finish (or refund) it. Trusting the job id in the request let a
   * made-up id, which always reports "failed", refund credits for photos the user had
   * already received from the real job.
   */
  const ownsPaidJob = async () => {
    if (!generationId) return false;
    const { user, sb } = await currentUser();
    if (!user || !sb) return false;
    const { data } = await sb.from("generations").select("provider_job_id").eq("id", generationId).maybeSingle();
    return !!data && data.provider_job_id === jobId;
  };

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
      // the paid generation now follows the demo job, so that job's polls can finish it
      if (generationId && (await ownsPaidJob())) {
        await supabaseAdmin()?.rpc("finish_generation", { p_generation_id: generationId, p_ok: null, p_job_id: newJobId });
      }
      return NextResponse.json({ status: "running", progress: 60, jobId: newJobId });
    }
    status = { status: "failed" as const, error: "AI failed" };
  }

  // Cloud accounts: record completion, refund credits on failure (once, in Postgres).
  let refunded = false;
  if (generationId && (status.status === "done" || status.status === "failed") && (await ownsPaidJob())) {
    await supabaseAdmin()?.rpc("finish_generation", {
      p_generation_id: generationId,
      p_ok: status.status === "done",
      p_error: status.error ?? null,
    });
    refunded = status.status === "failed";
  }

  return NextResponse.json({ ...status, refunded });
}
