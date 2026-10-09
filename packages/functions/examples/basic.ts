import { Frontal } from "@frontal-labs/sdk";

// Example: Define and invoke a simple function
async function example() {
  const f = new Frontal({ apiKey: process.env.FRONTAL_API_KEY! });

  // Define a new function
  const helloFunc = await f.functions
    .define("hello-world")
    .runtime("nodejs20")
    .entrypoint("index.handler")
    .description("A simple hello world function")
    .inputSchema({ name: { type: "string" } })
    .outputSchema({ message: { type: "string" } })
    .create();

  console.log("Created function:", helloFunc.id);

  // Invoke the function
  const result = await f.functions.executions.invoke({
    functionId: helloFunc.id,
    input: { name: "World" },
  });

  console.log("Function result:", result);
}

example().catch(console.error);