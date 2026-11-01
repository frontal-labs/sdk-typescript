/**
 * Keeps embeddings honest:
 * - the committed `ai.openapi.json` publishes `POST /v1/embeddings` as a public
 *   SDK route, and no longer lists the internal copy;
 * - the test mock answers in the shape the SDK's wire schema accepts, so the
 *   SDK's real validation runs against the same contract the spec describes.
 */

import { readFileSync } from "node:fs";
import {
  createTestHttpClient,
  mockEmbeddingModel,
} from "@frontal-labs/testing";
import { describe, expect, it } from "vitest";
import {
  AI_OPENAPI_PATH,
  type OpenApiDocument,
} from "../../../scripts/generate-decisions-openapi";
import { EmbeddingsResource } from "../src/embeddings";

const committed = JSON.parse(
  readFileSync(AI_OPENAPI_PATH, "utf8")
) as OpenApiDocument & {
  paths: Record<string, { post?: { x_route_class?: string } }>;
};

describe("embeddings in ai.openapi.json", () => {
  it("publishes POST /v1/embeddings as a public SDK route", () => {
    expect(committed.paths["/v1/embeddings"]?.post?.x_route_class).toBe(
      "public-sdk"
    );
  });

  it("no longer lists the internal embeddings route", () => {
    expect(committed.paths["/internal/embeddings"]).toBeUndefined();
  });
});

describe("mockEmbeddingModel", () => {
  it("answers in a shape the SDK accepts, with vectors in input order", async () => {
    const model = mockEmbeddingModel({ dimensions: 4 });
    const { http, mock } = createTestHttpClient(model.routes);
    const embeddings = new EmbeddingsResource(http);

    const batch = await embeddings.embedMany({
      model: "embed-small",
      input: ["alpha", "beta"],
    });

    expect(batch.embeddings).toHaveLength(2);
    expect(batch.embeddings[0]).toHaveLength(4);
    expect(batch.model).toBe("embed-small");
    expect(mock.callCount("POST", "/v1/embeddings")).toBe(1);
    expect(model.calls[0]).toMatchObject({
      model: "embed-small",
      input: ["alpha", "beta"],
    });
  });

  it("is deterministic for the same input", async () => {
    const model = mockEmbeddingModel({ dimensions: 3 });
    const { http } = createTestHttpClient(model.routes);
    const embeddings = new EmbeddingsResource(http);
    const first = await embeddings.embed({ model: "m", input: "same" });
    const second = await embeddings.embed({ model: "m", input: "same" });
    expect(first.embedding).toEqual(second.embedding);
  });

  it("serves base64 when asked, and the SDK returns it as a string", async () => {
    const model = mockEmbeddingModel({ dimensions: 2 });
    const { http } = createTestHttpClient(model.routes);
    const embeddings = new EmbeddingsResource(http);
    const response = await embeddings.create({
      model: "m",
      input: "a",
      encodingFormat: "base64",
    });
    expect(typeof response.data[0]?.embedding).toBe("string");
  });
});
