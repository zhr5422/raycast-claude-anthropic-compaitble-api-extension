export function extractTextContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter((block): block is { type: "text"; text: string } => {
      return (
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string"
      );
    })
    .map((block) => block.text)
    .join("");
}
