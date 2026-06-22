import type { AIProvider } from "./types";
import { mockProvider } from "./mockProvider";
import { geminiProvider } from "./geminiProvider";

/**
 * Selects the active AI provider via the AI_PROVIDER env var.
 * Today only "mock" is wired up (no API key needed). To add real generation
 * later, implement an AIProvider for gemini/openai and branch here — the rest
 * of the app talks only to this interface, so nothing else changes.
 */
export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

  switch (provider) {
    case "mock":
      return mockProvider;
    case "gemini":
      if (!process.env.GEMINI_API_KEY) {
        console.warn(
          "AI_PROVIDER=gemini but GEMINI_API_KEY is not set — falling back to mock."
        );
        return mockProvider;
      }
      return geminiProvider;
    // case "openai": return openaiProvider;
    default:
      return mockProvider;
  }
}
