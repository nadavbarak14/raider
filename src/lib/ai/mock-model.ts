import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
  LanguageModelV3StreamPart,
} from '@ai-sdk/provider';

/**
 * Create a mock LanguageModelV3 that returns a predetermined response.
 * This allows using Vercel AI SDK's `streamText` with the same interface
 * that a real model would use, making the swap to real Claude trivial.
 *
 * @param responseText - The text to return as the model's response
 */
export function createMockModel(responseText: string): LanguageModelV3 {
  return {
    specificationVersion: 'v3',
    provider: 'raider-mock',
    modelId: 'mock-v1',
    supportedUrls: {},

    async doGenerate(): Promise<LanguageModelV3GenerateResult> {
      return {
        content: [{ type: 'text', text: responseText }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: {
            total: 0,
            noCache: 0,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: {
            total: responseText.length,
            text: responseText.length,
            reasoning: undefined,
          },
        },
        warnings: [],
      };
    },

    async doStream(): Promise<LanguageModelV3StreamResult> {
      const textId = 'text-0';

      // Simulate streaming by breaking the text into word-sized chunks
      const words = responseText.split(/(?<=\s)/); // split keeping whitespace attached
      const streamParts: LanguageModelV3StreamPart[] = [
        { type: 'stream-start', warnings: [] },
        { type: 'text-start', id: textId },
        ...words.map(
          (word): LanguageModelV3StreamPart => ({
            type: 'text-delta',
            id: textId,
            delta: word,
          })
        ),
        { type: 'text-end', id: textId },
        {
          type: 'finish',
          usage: {
            inputTokens: {
              total: 0,
              noCache: 0,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: {
              total: responseText.length,
              text: responseText.length,
              reasoning: undefined,
            },
          },
          finishReason: { unified: 'stop', raw: 'stop' },
        },
      ];

      const stream = new ReadableStream<LanguageModelV3StreamPart>({
        async start(controller) {
          for (const part of streamParts) {
            // Small delay between words to simulate streaming
            if (part.type === 'text-delta') {
              await new Promise((resolve) => setTimeout(resolve, 15));
            }
            controller.enqueue(part);
          }
          controller.close();
        },
      });

      return { stream };
    },
  };
}
