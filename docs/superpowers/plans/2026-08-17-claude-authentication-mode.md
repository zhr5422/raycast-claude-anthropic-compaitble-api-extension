# Claude Authentication Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit X-API-Key and Bearer Token authentication to the Claude Raycast extension, then verify both response modes against the approved QA gateway in Raycast Beta.

**Architecture:** Keep one credential preference and add a required authentication-type dropdown. Convert preferences into mutually exclusive Anthropic SDK `apiKey` or `authToken` options inside the existing connection module, leaving chat, history, model, selection, and streaming hooks unchanged.

**Tech Stack:** TypeScript, React, Raycast API 1.104.23, Anthropic TypeScript SDK 0.18, Vitest, Raycast Beta.

## Global Constraints

- `X-API-Key` remains the default and the fallback when an existing saved preference has no authentication type.
- `Bearer Token` sends only `Authorization: Bearer [credential]`; never send both authentication headers.
- Never log, commit, document, or place the user-provided API credential in shell history.
- Preserve the existing Base URL normalization and append `/v1/messages` through the Anthropic SDK.
- Do not change model management, chat history, saved answers, conversations, selected-text loading, or streaming UI behavior.
- The QA Base URL is `https://qa.aiapi.amh-group.com/eezgenblcnjjnkenqqkenzq` and the model is `qwen3.7-plus`.

---

## File Structure

- `extensions/claude/package.json`: Raycast preference manifest and Raycast API dependency version.
- `extensions/claude/package-lock.json`: reproducible dependency graph.
- `extensions/claude/src/api/connection.ts`: authentication preference types and Anthropic SDK option construction.
- `extensions/claude/src/api/connection.test.ts`: isolated option-building and backward-compatibility tests.
- `extensions/claude/src/api/connection.integration.test.ts`: real local HTTP assertions for outgoing headers and SSE handling.
- `extensions/claude/raycast-env.d.ts`: generated Raycast preference types; regenerate through the CLI and do not hand-edit.

### Task 1: Stabilize the Raycast Beta CLI Baseline

**Files:**
- Modify: `extensions/claude/package.json`
- Modify: `extensions/claude/package-lock.json`

**Interfaces:**
- Consumes: Raycast Beta's current extension runtime.
- Produces: local CLI and API version `@raycast/api@^1.104.23` used by every later task.

- [ ] **Step 1: Verify the dependency declaration**

Confirm `extensions/claude/package.json` contains the dependency below under `dependencies`, not `devDependencies`:

```json
"@raycast/api": "^1.104.23"
```

- [ ] **Step 2: Recreate the lockfile state**

Run:

```bash
cd extensions/claude
npm install
```

Expected: installation succeeds; Node 22.19.0 may print the package's Node `>=22.22.2` engine warning, but the CLI remains executable for the current verification run.

- [ ] **Step 3: Verify the baseline**

Run:

```bash
npm run lint
npm test
npm run build
```

Expected: lint passes, 11 tests pass, and the distribution build succeeds.

- [ ] **Step 4: Commit the dependency baseline**

```bash
git add extensions/claude/package.json extensions/claude/package-lock.json
git commit -m "chore(claude): update Raycast API"
```

### Task 2: Build Mutually Exclusive SDK Authentication Options

**Files:**
- Modify: `extensions/claude/src/api/connection.test.ts`
- Modify: `extensions/claude/src/api/connection.integration.test.ts`
- Modify: `extensions/claude/src/api/connection.ts`

**Interfaces:**
- Consumes: `ConnectionPreferences` containing `apiBaseUrl`, `apiKey`, and optional `authenticationType`.
- Produces: `AuthenticationType = "api-key" | "bearer"`, `buildAnthropicOptions(preferences)` returning `{ baseURL, apiKey }` or `{ baseURL, authToken }`, and real HTTP coverage for both response modes.

- [ ] **Step 1: Write failing unit tests**

Replace the single SDK-options test in `connection.test.ts` with these behaviors:

```ts
it("uses X-API-Key authentication by default", () => {
  expect(buildAnthropicOptions({ apiBaseUrl: "https://self-hosted.example/", apiKey: "private-key" })).toEqual({
    baseURL: "https://self-hosted.example",
    apiKey: "private-key",
  });
});

it("uses X-API-Key authentication when selected", () => {
  expect(
    buildAnthropicOptions({
      apiBaseUrl: "https://self-hosted.example/",
      apiKey: "private-key",
      authenticationType: "api-key",
    }),
  ).toEqual({ baseURL: "https://self-hosted.example", apiKey: "private-key" });
});

it("uses Bearer authentication when selected", () => {
  expect(
    buildAnthropicOptions({
      apiBaseUrl: "https://self-hosted.example/",
      apiKey: "private-key",
      authenticationType: "bearer",
    }),
  ).toEqual({ baseURL: "https://self-hosted.example", authToken: "private-key" });
});
```

- [ ] **Step 2: Write failing integration tests**

In `connection.integration.test.ts`, add a non-streaming test that creates the client with `authenticationType: "bearer"`, calls `client.messages.create`, and asserts:

```ts
expect(capturedRequests[0].headers.authorization).toBe("Bearer local-secret");
expect(capturedRequests[0].headers).not.toHaveProperty("x-api-key");
```

Add a streaming test using the same preference, consume the stream with the existing `text`/`end` listeners, and assert:

```ts
expect(capturedRequests[0].headers.authorization).toBe("Bearer local-secret");
expect(capturedRequests[0].headers).not.toHaveProperty("x-api-key");
expect(textChunks.join("")).toBe("stream reply");
```

For both existing X-API-Key request tests, also assert:

```ts
expect(capturedRequests[0].headers).not.toHaveProperty("authorization");
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
npm test -- src/api/connection.test.ts src/api/connection.integration.test.ts
```

Expected: the Bearer cases fail because `ConnectionPreferences` does not accept `authenticationType` and the option builder always returns `apiKey`.

- [ ] **Step 4: Implement the minimal option builder**

Update `connection.ts` with these types and branch:

```ts
export type AuthenticationType = "api-key" | "bearer";

export interface ConnectionPreferences {
  apiBaseUrl: string;
  apiKey: string;
  authenticationType?: AuthenticationType;
}

type AnthropicOptions =
  | { baseURL: string; apiKey: string }
  | { baseURL: string; authToken: string };

export function buildAnthropicOptions(preferences: ConnectionPreferences): AnthropicOptions {
  const baseURL = normalizeApiBaseUrl(preferences.apiBaseUrl);

  if (preferences.authenticationType === "bearer") {
    return { baseURL, authToken: preferences.apiKey };
  }

  return { baseURL, apiKey: preferences.apiKey };
}
```

Keep `createAnthropicClient` calling `new Anthropic(buildAnthropicOptions(preferences))`.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
npm test -- src/api/connection.test.ts src/api/connection.integration.test.ts
```

Expected: all URL, option-building, outgoing-header, non-streaming, and streaming tests pass. Bearer requests contain only `authorization`; API-key requests contain only `x-api-key`.

- [ ] **Step 6: Commit the option behavior and integration coverage**

```bash
git add extensions/claude/src/api/connection.ts extensions/claude/src/api/connection.test.ts extensions/claude/src/api/connection.integration.test.ts
git commit -m "feat(claude): support bearer authentication options"
```

### Task 3: Add the Raycast Authentication Preference

**Files:**
- Modify: `extensions/claude/package.json`
- Generated: `extensions/claude/raycast-env.d.ts`

**Interfaces:**
- Consumes: the `authenticationType` property from Task 2.
- Produces: a required Raycast dropdown whose values are exactly `api-key` and `bearer`.

- [ ] **Step 1: Add the manifest preference**

Insert this preference immediately before `apiKey` in `package.json`:

```json
{
  "name": "authenticationType",
  "label": "Authentication Type",
  "description": "Choose how the compatible service authenticates requests",
  "type": "dropdown",
  "title": "Authentication Type",
  "default": "api-key",
  "required": true,
  "data": [
    { "title": "X-API-Key", "value": "api-key" },
    { "title": "Bearer Token", "value": "bearer" }
  ]
}
```

- [ ] **Step 2: Regenerate Raycast types and validate the manifest**

Run:

```bash
npm run build
npm run lint
```

Expected: Raycast regenerates `raycast-env.d.ts`, validates the dropdown, type-checks the preferences, and reports no lint errors.

- [ ] **Step 3: Run the complete automated suite**

Run:

```bash
npm test
npm run build
```

Expected: all unit and integration tests pass and the distribution build succeeds.

- [ ] **Step 4: Commit the preference**

```bash
git add extensions/claude/package.json
git commit -m "feat(claude): configure compatible API authentication"
```

Do not add `raycast-env.d.ts` if it remains ignored or untracked by the repository.

### Task 4: Configure and Exercise Raycast Beta End to End

**Files:**
- Modify outside Git: Raycast Beta encrypted extension preferences.
- Verify outside Git: `/Users/admin/Library/LaunchAgents/com.local.raycast-claude-dev.plist`.

**Interfaces:**
- Consumes: Base URL, user-supplied credential from the current task, model `qwen3.7-plus`, and the `Bearer Token` preference.
- Produces: observed non-streaming and streaming marker responses through the actual `Ask Question` UI.

- [ ] **Step 1: Restart the persistent development service**

Run:

```bash
launchctl kickstart -k gui/$(id -u)/com.local.raycast-claude-dev
```

Expected: `launchctl print gui/$(id -u)/com.local.raycast-claude-dev` reports `state = running` with no exit code.

- [ ] **Step 2: Configure Raycast Beta preferences**

In Raycast Beta's Claude extension settings, set:

```text
API Base URL: https://qa.aiapi.amh-group.com/eezgenblcnjjnkenqqkenzq
Authentication Type: Bearer Token
API Key: use the credential supplied by the user in this task
Default Model: qwen3.7-plus
```

Keep the credential masked and do not expose it in screenshots, accessibility output, logs, or the repository.

- [ ] **Step 3: Verify non-streaming through the extension UI**

Disable `Stream Responses`, open `Ask Question`, and submit:

```text
Reply with exactly: RAYCAST_EXTENSION_NON_STREAM_OK
```

Expected: the rendered answer contains `RAYCAST_EXTENSION_NON_STREAM_OK` and no authentication or executable error.

- [ ] **Step 4: Verify streaming through the extension UI**

Enable `Stream Responses`, reopen `Ask Question`, and submit:

```text
Reply with exactly: RAYCAST_EXTENSION_STREAM_OK
```

Expected: the answer streams into the detail view and finishes with `RAYCAST_EXTENSION_STREAM_OK`.

- [ ] **Step 5: Run final repository verification**

Run:

```bash
git status --short
npm run lint
npm test
npm run build
```

Expected: only intentional files are changed, lint passes, all tests pass, and the distribution build succeeds.

- [ ] **Step 6: Commit the generated preference type only if tracked**

If final verification changed the tracked generated type file, commit only that file with:

```bash
git add extensions/claude/raycast-env.d.ts
git commit -m "chore(claude): finalize compatible authentication"
```

If no tracked adjustments remain, do not create an empty commit.
