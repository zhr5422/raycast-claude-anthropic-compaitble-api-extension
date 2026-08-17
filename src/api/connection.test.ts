import { describe, expect, it } from "vitest";
import { buildAnthropicOptions, normalizeApiBaseUrl } from "./connection";

describe("normalizeApiBaseUrl", () => {
  it("preserves a path prefix and removes whitespace and trailing slashes", () => {
    expect(normalizeApiBaseUrl("  https://gateway.example/anthropic/// ")).toBe("https://gateway.example/anthropic");
  });

  it.each(["", "not-a-url", "ftp://gateway.example"])("rejects invalid service URL %j", (value) => {
    expect(() => normalizeApiBaseUrl(value)).toThrow("valid HTTP(S) API Base URL");
  });
});

it("builds SDK options only from the configured endpoint and key", () => {
  expect(buildAnthropicOptions({ apiBaseUrl: "https://self-hosted.example/", apiKey: "private-key" })).toEqual({
    baseURL: "https://self-hosted.example",
    apiKey: "private-key",
  });
});
