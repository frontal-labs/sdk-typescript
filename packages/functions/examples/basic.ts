import { Frontal } from "@frontal-labs/sdk";
import { kv, blob, ai, ontology, data, telemetry } from "@frontal-labs/functions/capabilities";

// Example: Define and invoke a function with capabilities
async function example() {
  const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

  // Define a new function with capabilities
  const processPayment = await f.functions
    .define("process-payment")
    .runtime("nodejs22")
    .handler("payment.handler")
    .description("Process a payment and emit receipt")
    .secret("STRIPE_SECRET_KEY")
    .capabilities(
      kv({
        namespace: "payments",
        keyPrefix: "ledger/",
        operations: ["read", "write"],
        budget: { timeout: "5s", maxCostUsd: 0.10 },
      }),
      blob({
        bucket: "receipts",
        objectPrefix: "pdfs/",
        operations: ["write"],
        budget: { timeout: "10s" },
      }),
      ai({
        modelIds: "@cf/meta/llama-3-8b-instruct",
        operations: ["chat"],
        budget: { maxTokens: 2000, maxCostUsd: 0.50 },
      }),
      ontology({
        resourceIds: "customer-profile",
        operations: ["read", "search"],
      })
    )
    .memory(256)
    .timeout(30)
    .create();

  console.log("Created function:", processPayment.id);

  // Invoke the function
  const result = await f.functions.executions.invoke({
    functionId: processPayment.id,
    input: { amount: 2999 },
    idempotencyKey: "pay-order-123",
  });

  console.log("Function result:", result);
}

example().catch(console.error);