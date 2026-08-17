import { describe, expect, it } from "vitest";
import { createDefaultModel, resolveStoredModels } from "./model-config";

const now = new Date("2026-08-17T00:00:00.000Z");

describe("configured default model", () => {
  it("creates the default model with the provider model identifier unchanged", () => {
    expect(createDefaultModel("vendor/sonnet", now)).toMatchObject({
      id: "default",
      name: "Default Model",
      option: "vendor/sonnet",
      max_tokens: "4096",
    });
  });

  it("rejects an empty configured model identifier", () => {
    expect(() => createDefaultModel("   ", now)).toThrow("Default Model");
  });

  it("uses the configured default when no stored models exist", () => {
    const configured = createDefaultModel("vendor/default", now);
    expect(resolveStoredModels(undefined, configured)).toEqual([configured]);
  });

  it("updates only the stored default identifier and preserves custom models", () => {
    const configured = createDefaultModel("vendor/new-default", now);
    const stored = JSON.stringify([
      { ...configured, option: "old-default" },
      { ...configured, id: "custom", name: "Coding", option: "vendor/code" },
    ]);

    expect(resolveStoredModels(stored, configured).map(({ id, option }) => ({ id, option }))).toEqual([
      { id: "default", option: "vendor/new-default" },
      { id: "custom", option: "vendor/code" },
    ]);
  });
});
