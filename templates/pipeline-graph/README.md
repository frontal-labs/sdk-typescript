# Pipeline → graph → lineage template

Defines a scheduled pipeline that upserts CRM contacts into the knowledge
graph, triggers it, then queries the graph and traces lineage for a result.

```bash
cp -r templates/pipeline-graph my-sync && cd my-sync
cp .env.example .env      # FRONTAL_API_KEY=frt_...
bun install && bun start
```

`src/index.ts` exports `run(f)`; the SDK repo tests it against mocks in
`tests/templates/pipeline-graph.test.ts`.

What to change: the `collect` source, the `transform` mapping, and the
`entityType` written to the graph.
