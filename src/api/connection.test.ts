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

it("uses X-API-Key authentication by default", () => {
  expect(buildAnthropicOptions({ apiBaseUrl: "https://self-hosted.example/", apiKey: "private-key" })).toEqual({
    baseURL: "https://self-hosted.example",
    apiKey: "private-key",
    authToken: null,
  });
});

it("uses X-API-Key authentication when selected", () => {
  expect(
    buildAnthropicOptions({
      apiBaseUrl: "https://self-hosted.example/",
      apiKey: "private-key",
      authenticationType: "api-key",
    }),
  ).toEqual({ baseURL: "https://self-hosted.example", apiKey: "private-key", authToken: null });
});

it("uses Bearer authentication when selected", () => {
  expect(
    buildAnthropicOptions({
      apiBaseUrl: "https://self-hosted.example/",
      apiKey: "private-key",
      authenticationType: "bearer",
    }),
  ).toEqual({ baseURL: "https://self-hosted.example", apiKey: null, authToken: "private-key" });
});
