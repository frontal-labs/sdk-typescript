import { Frontal } from "@frontal-labs/sdk";

/**
 * Nightly export:
 *   1. register a cron schedule that targets an export workflow
 *   2. run one export now: read a blob object, re-upload it to the export
 *      prefix
 *   3. mint a short-lived signed URL for the download
 */
export async function run(
  f: Frontal,
  opts: { sourceKey: string; bucket: string } = {
    sourceKey: "orders/latest.parquet",
    bucket: "exports",
  }
) {
  const schedule = await f.schedules.create({
    name: "nightly-orders-export",
    cron: "0 2 * * *",
    timezone: "UTC",
    target: { type: "workflow", id: "wf_export_orders" },
    payload: { sourceKey: opts.sourceKey, bucket: opts.bucket },
  });

  const artifact = await f.blob.download({
    bucket: opts.bucket,
    key: opts.sourceKey,
  });
  const bytes = new Uint8Array(await artifact.arrayBuffer());

  const key = `${opts.sourceKey.split("/")[0]}/${new Date().toISOString().slice(0, 10)}.parquet`;
  await f.blob.upload({
    bucket: opts.bucket,
    key,
    data: bytes,
    contentType: "application/octet-stream",
  });

  const url = await f.blob.getSignedUrl({
    bucket: opts.bucket,
    options: { key, operation: "read", expiresIn: 3600 },
  });

  return { scheduleId: schedule.id, key, bytes: bytes.byteLength, url };
}

if (import.meta.main) {
  const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });
  console.log(await run(f));
}
