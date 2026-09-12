# Cron export template

Registers a nightly schedule, performs one export now (dataset artifact →
blob), and returns a signed download URL.

```bash
cp -r templates/cron-export my-export && cd my-export
cp .env.example .env      # FRONTAL_API_KEY=frt_...
bun install && bun start
```

`src/index.ts` exports `run(f, { datasetId, manifestId, bucket })`; the SDK
repo tests it against mocks in `tests/templates/cron-export.test.ts`.

What to change: the cron expression, the dataset/manifest ids, the bucket, and
the signed-URL TTL.
