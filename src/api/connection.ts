import Anthropic from "@anthropic-ai/sdk";

export type AuthenticationType = "api-key" | "bearer";

export interface ConnectionPreferences {
  apiBaseUrl: string;
  apiKey: string;
  authenticationType?: AuthenticationType;
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

type AnthropicOptions =
  | { baseURL: string; apiKey: string; authToken: null }
  | { baseURL: string; apiKey: null; authToken: string };

export function buildAnthropicOptions(preferences: ConnectionPreferences): AnthropicOptions {
  const baseURL = normalizeApiBaseUrl(preferences.apiBaseUrl);

  if (preferences.authenticationType === "bearer") {
    return { baseURL, apiKey: null, authToken: preferences.apiKey };
  }

  return { baseURL, apiKey: preferences.apiKey, authToken: null };
}

export function createAnthropicClient(preferences: ConnectionPreferences): Anthropic {
  return new Anthropic(buildAnthropicOptions(preferences));
}
