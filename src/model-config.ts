import { Model } from "./type";

export const DEFAULT_MODEL_ID = "default";

export function createDefaultModel(modelId: string, now: Date = new Date()): Model {
  const option = modelId.trim();
  if (!option) {
    throw new Error("Default Model is required");
  }

  const timestamp = now.toISOString();
  return {
    id: DEFAULT_MODEL_ID,
    updated_at: timestamp,
    created_at: timestamp,
    name: "Default Model",
    prompt: "You are a useful assistant",
    option,
    temperature: "1",
    max_tokens: "4096",
    pinned: false,
  };
}

export function resolveStoredModels(stored: string | undefined, configuredDefault: Model): Model[] {
  if (!stored) {
    return [configuredDefault];
  }

  const models = JSON.parse(stored) as Model[];
  const hasDefault = models.some((model) => model.id === DEFAULT_MODEL_ID);

  if (!hasDefault) {
    return [configuredDefault, ...models];
  }

  return models.map((model) =>
    model.id === DEFAULT_MODEL_ID ? { ...model, option: configuredDefault.option } : model
  );
}
