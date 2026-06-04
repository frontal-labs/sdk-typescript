# Frontal AI SDK Examples

This directory contains comprehensive examples demonstrating how to use the Frontal AI SDK for various AI tasks and workflows.

## Available Examples

### Core AI Capabilities

1. **[Basic Text Generation](./basic-text-generation.ts)**
   - Simple text generation with prompts
   - Conversation history management
   - Custom parameters (temperature, tokens, etc.)

2. **[Streaming Text Generation](./streaming-text-generation.ts)**
   - Real-time text streaming
   - Chunk processing and callbacks
   - Different streaming patterns

3. **[Embeddings](./embeddings.ts)**
   - Text embedding generation
   - Semantic similarity calculations
   - Vector search and clustering

4. **[Structured Object Generation](./structured-object-generation.ts)**
   - Type-safe JSON generation with Zod schemas
   - Data extraction and transformation
   - Validation and retry mechanisms

### Media Generation

5. **[Speech Generation](./speech-generation.ts)**
   - Text-to-speech conversion
   - Multiple voices and languages
   - Audio format options

6. **[Image Generation](./image-generation.ts)**
   - Text-to-image generation
   - Different styles and qualities
   - Product visualization and character design

7. **[Video Generation](./video-generation.ts)**
   - Text-to-video generation
   - Resolution and format options
   - Themed and educational content

### Content Analysis

8. **[Transcription](./transcription.ts)**
   - Audio-to-text conversion
   - Multiple languages and formats
   - Real-time processing simulation

9. **[Content Moderation](./moderation.ts)**
   - Content safety analysis
   - Custom threshold handling
   - Batch processing

### Advanced Features

10. **[Prompt Management](./prompt-management.ts)**
   - Create and manage prompts
   - Template variables and chaining
   - Versioning and evolution

11. **[Tool System](./tool-system.ts)**
   - Custom tool definition
   - Tool registration and execution
   - Error handling and composition

12. **[Comprehensive Usage](./comprehensive-usage.ts)**
   - Multi-modal AI workflows
   - Real-world application scenarios
   - Performance optimization

## Getting Started

### Prerequisites

- Node.js 18+ or Bun runtime
- Frontal AI SDK installed
- Valid API credentials in environment variables

### Environment Setup

```bash
# Install dependencies
bun install

# Set up environment variables
export FRONTAL_API_KEY="your-api-key"
export FRONTAL_BASE_URL="https://api.frontal.dev"
```

### Running Examples

Each example can be run individually:

```bash
# Run a specific example
bun run examples/basic-text-generation.ts

# Or run with node
node examples/basic-text-generation.ts
```

## Example Categories

### 🚀 Quick Start
- **Basic Text Generation** - Learn fundamental text generation
- **Streaming Text Generation** - Understand real-time responses

### 🎯 Intermediate
- **Embeddings** - Explore semantic search
- **Structured Objects** - Master type-safe generation
- **Speech Generation** - Add voice capabilities

### 🎨 Media & Content
- **Image Generation** - Create visual content
- **Video Generation** - Generate dynamic media
- **Transcription** - Process audio content
- **Content Moderation** - Ensure content safety

### 🛠️ Advanced
- **Prompt Management** - Build reusable prompts
- **Tool System** - Extend AI capabilities
- **Comprehensive Usage** - Real-world integration

## Best Practices

### Error Handling
All examples include comprehensive error handling:
```typescript
if (result.error) {
  console.error("❌ Error:", result.error.message);
  return;
}
```

### TypeScript Usage
Examples leverage TypeScript for type safety:
- Proper typing of parameters
- Schema validation with Zod
- Interface implementations

### Performance Considerations
- Token counting and cost estimation
- Streaming vs non-streaming comparisons
- Model selection guidelines

## Common Patterns

### 1. Initialization
```typescript
import { AI } from "@frontal-labs/ai";

const ai = new AI();
// Or with custom config
const ai = new AI({
  apiKey: "your-key",
  baseUrl: "custom-endpoint"
});
```

### 2. API Calls
```typescript
const result = await ai.generateText({
  model: "gpt-3.5-turbo",
  prompt: "Your prompt here",
  temperature: 0.7,
});

if (result.error) {
  // Handle error
} else {
  // Use result.data
}
```

### 3. Streaming
```typescript
const stream = ai.streamText({
  model: "gpt-3.5-turbo",
  prompt: "Your prompt",
  onChunk: (chunk) => {
    console.log(chunk);
  },
});

await stream.usage;
```

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   - Ensure `FRONTAL_API_KEY` is set
   - Check key validity

2. **Network Errors**
   - Verify internet connection
   - Check API endpoint URL

3. **Model Not Available**
   - Use `ai.listModels()` to see available models
   - Check model spelling

4. **Type Errors**
   - Ensure TypeScript compilation
   - Check Zod schema definitions

### Getting Help

- Check the [Frontal AI Documentation](../../docs/README.md)
- Review API response codes
- Examine error messages carefully

## Contributing

To add new examples:

1. Follow the existing code structure
2. Include comprehensive error handling
3. Add TypeScript types and JSDoc comments
4. Test with different scenarios
5. Update this README

## License

These examples are part of the Frontal Core and follow the same [MIT License](../../LICENSE.md).
