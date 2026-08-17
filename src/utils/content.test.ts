import { describe, expect, it } from "vitest";
import { extractTextContent } from "./content";

describe("extractTextContent", () => {
  it("concatenates text blocks after a non-text reasoning block", () => {
    const content = [
      { type: "thinking", thinking: "internal reasoning" },
      { type: "text", text: "RAYCAST_" },
      { type: "tool_use", id: "tool_1", name: "lookup", input: {} },
      { type: "text", text: "EXTENSION_NON_STREAM_OK" },
    ];

    expect(extractTextContent(content)).toBe("RAYCAST_EXTENSION_NON_STREAM_OK");
  });
});
