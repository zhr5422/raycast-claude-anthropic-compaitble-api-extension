# Claude Authentication Mode Design

## Goal

Allow the Claude Raycast extension to call Anthropic-compatible Messages APIs that authenticate either with `X-API-Key` or `Authorization: Bearer`, while preserving existing behavior by default.

## User Interface

Add a required `Authentication Type` dropdown to the extension preferences:

- `X-API-Key` — default, preserving compatibility with existing configurations.
- `Bearer Token` — for gateways that expect `Authorization: Bearer <token>`.

The existing password field remains the single credential input. Its stored value is interpreted according to the selected authentication type. Base URL and default model settings remain unchanged.

## Client Construction

Extend `ConnectionPreferences` with an authentication type. Normalize the Base URL as today, then construct the Anthropic SDK client with exactly one credential option:

- `X-API-Key`: pass the stored credential as `apiKey`.
- `Bearer Token`: pass the stored credential as `authToken`.

Do not send both authentication headers. Unknown or missing authentication values fall back to `X-API-Key` so existing saved preferences continue to work.

## Data Flow

Raycast preferences provide Base URL, credential, authentication type, and default model. `createAnthropicClient` converts those preferences into SDK options. The existing chat hooks continue using the same client, so history, conversations, selected-text loading, and streaming behavior require no changes.

## Errors and Security

URL validation remains unchanged. Authentication failures continue to surface through the extension's existing API error handling. Credentials stay in Raycast's password preference storage and must never be logged, committed, embedded in tests, or included in documentation.

## Verification

Use test-driven development:

1. Add failing unit tests for SDK options in both authentication modes and the backward-compatible default.
2. Add failing integration tests that assert the actual outgoing header for non-streaming and streaming requests.
3. Implement the minimal preference and client changes.
4. Run lint, all automated tests, and a distribution build.
5. Configure Raycast Beta with the approved QA endpoint, credential, Bearer authentication, and `qwen3.7-plus`.
6. Run one non-streaming and one streaming prompt through the actual extension UI and verify the returned marker text.

## Out of Scope

- Automatic authentication probing.
- Sending multiple authentication headers.
- Persisting credentials outside Raycast preferences.
- Changes to model management, history, saved answers, or conversation storage.
