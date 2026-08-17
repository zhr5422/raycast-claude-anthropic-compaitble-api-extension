import { AddressInfo } from "node:net";
import { createServer, IncomingHttpHeaders, Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAnthropicClient } from "./connection";

interface CapturedRequest {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

const messageResponse = {
  id: "msg_test",
  type: "message",
  role: "assistant",
  content: [{ type: "text", text: "non-stream reply" }],
  model: "vendor/test-model",
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 4, output_tokens: 3 },
};

const streamEvents = [
  [
    "message_start",
    {
      type: "message_start",
      message: {
        id: "msg_stream",
        type: "message",
        role: "assistant",
        content: [],
        model: "vendor/test-model",
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 4, output_tokens: 0 },
      },
    },
  ],
  ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
  ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "stream " } }],
  ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "reply" } }],
  ["content_block_stop", { type: "content_block_stop", index: 0 }],
  [
    "message_delta",
    {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 2 },
    },
  ],
  ["message_stop", { type: "message_stop" }],
] as const;

async function withEnvironmentVariable<T>(name: string, value: string, operation: () => Promise<T>): Promise<T> {
  const originalValue = process.env[name];
  process.env[name] = value;

  try {
    return await operation();
  } finally {
    if (originalValue === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = originalValue;
    }
  }
}

describe("Anthropic-compatible Messages API", () => {
  let server: Server;
  let baseURL: string;
  let capturedRequests: CapturedRequest[];

  beforeEach(async () => {
    capturedRequests = [];
    server = createServer(async (request, response) => {
      let rawBody = "";
      for await (const chunk of request) {
        rawBody += chunk;
      }

      const body = JSON.parse(rawBody) as Record<string, unknown>;
      capturedRequests.push({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body,
      });

      if (body.stream === true) {
        response.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        for (const [event, data] of streamEvents) {
          response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }
        response.end();
        return;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(messageResponse));
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseURL = `http://127.0.0.1:${address.port}/gateway`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("sends non-streaming requests to the configured service", async () => {
    await withEnvironmentVariable("ANTHROPIC_AUTH_TOKEN", "ambient-token", async () => {
      const client = createAnthropicClient({ apiBaseUrl: baseURL, apiKey: "local-secret" });
      const message = await client.messages.create({
        model: "vendor/test-model",
        max_tokens: 16,
        messages: [{ role: "user", content: "hello" }],
      });

      expect(capturedRequests).toHaveLength(1);
      expect(capturedRequests[0].headers).not.toHaveProperty("authorization");
      expect(capturedRequests[0]).toMatchObject({
        method: "POST",
        url: "/gateway/v1/messages",
        headers: { "x-api-key": "local-secret" },
        body: { model: "vendor/test-model" },
      });
      expect(capturedRequests[0].body).not.toHaveProperty("stream");
      expect(message.content[0]).toEqual({ type: "text", text: "non-stream reply" });
    });
  });

  it("sends non-streaming Bearer requests to the configured service", async () => {
    await withEnvironmentVariable("ANTHROPIC_API_KEY", "ambient-key", async () => {
      const client = createAnthropicClient({
        apiBaseUrl: baseURL,
        apiKey: "local-secret",
        authenticationType: "bearer",
      });
      await client.messages.create({
        model: "vendor/test-model",
        max_tokens: 16,
        messages: [{ role: "user", content: "hello" }],
      });

      expect(capturedRequests).toHaveLength(1);
      expect(capturedRequests[0].headers.authorization).toBe("Bearer local-secret");
      expect(capturedRequests[0].headers).not.toHaveProperty("x-api-key");
    });
  });

  it("assembles Anthropic-compatible SSE text events", async () => {
    const client = createAnthropicClient({ apiBaseUrl: baseURL, apiKey: "local-secret" });
    const textChunks: string[] = [];
    const stream = client.messages.stream({
      model: "vendor/test-model",
      max_tokens: 16,
      messages: [{ role: "user", content: "hello" }],
    });

    await new Promise<void>((resolve, reject) => {
      stream
        .on("text", (text) => textChunks.push(text))
        .on("end", resolve)
        .on("error", reject);
    });

    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0].headers).not.toHaveProperty("authorization");
    expect(capturedRequests[0]).toMatchObject({
      method: "POST",
      url: "/gateway/v1/messages",
      headers: { "x-api-key": "local-secret" },
      body: { model: "vendor/test-model", stream: true },
    });
    expect(textChunks.join("")).toBe("stream reply");
  });

  it("assembles Anthropic-compatible SSE text events with Bearer authentication", async () => {
    const client = createAnthropicClient({ apiBaseUrl: baseURL, apiKey: "local-secret", authenticationType: "bearer" });
    const textChunks: string[] = [];
    const stream = client.messages.stream({
      model: "vendor/test-model",
      max_tokens: 16,
      messages: [{ role: "user", content: "hello" }],
    });

    await new Promise<void>((resolve, reject) => {
      stream
        .on("text", (text) => textChunks.push(text))
        .on("end", resolve)
        .on("error", reject);
    });

    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0].headers.authorization).toBe("Bearer local-secret");
    expect(capturedRequests[0].headers).not.toHaveProperty("x-api-key");
    expect(textChunks.join("")).toBe("stream reply");
  });
});
