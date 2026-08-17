import { getPreferenceValues } from "@raycast/api";
import Anthropic from "@anthropic-ai/sdk";
import { useState } from "react";
import { ConnectionPreferences, createAnthropicClient } from "../api/connection";

export function useAnthropic(): Anthropic {
  const [anthropic] = useState(() => {
    const preferences = getPreferenceValues<ConnectionPreferences>();
    return createAnthropicClient(preferences);
  });

  return anthropic;
}
