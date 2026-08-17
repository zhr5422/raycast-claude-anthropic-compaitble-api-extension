import Anthropic from "@anthropic-ai/sdk";

export interface ConnectionPreferences {
  apiBaseUrl: string;
  apiKey: string;
}

export function normalizeApiBaseUrl(value: string): string {
  const normalized = value.trim().replace(/\/+$/, "");

  try {
    const url = new URL(normalized);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.host) {
      throw new Error();
    }
  } catch {
    throw new Error("Enter a valid HTTP(S) API Base URL");
  }

  return normalized;
}

export function buildAnthropicOptions(preferences: ConnectionPreferences): { apiKey: string; baseURL: string } {
  return {
    apiKey: preferences.apiKey,
    baseURL: normalizeApiBaseUrl(preferences.apiBaseUrl),
  };
}

export function createAnthropicClient(preferences: ConnectionPreferences): Anthropic {
  return new Anthropic(buildAnthropicOptions(preferences));
}
