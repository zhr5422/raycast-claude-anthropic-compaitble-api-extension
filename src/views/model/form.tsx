import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { Model, ModelHook, CSVPrompt } from "../../type";
import { parse } from "csv-parse/sync";

export const ModelForm = (props: { model?: Model; use: { models: ModelHook }; name?: string }) => {
  const { use, model } = props;
  const { pop } = useNavigation();

  const defaultModelOption = model?.option ?? use.models.defaultModel.option;

  const { handleSubmit, itemProps, setValue } = useForm<Model>({
    onSubmit: async (model) => {
      let updatedModel: Model = {
        ...model,
        updated_at: new Date().toISOString(),
      };
      updatedModel = {
        ...updatedModel,
        temperature: updatedModel.temperature,
      };
      if (props.model) {
        const toast = await showToast({
          title: "Update your model...",
          style: Toast.Style.Animated,
        });
        use.models.update({
          ...updatedModel,
          id: props.model.id,
          created_at: props.model.created_at,
        });
        toast.title = "Model updated!";
        toast.style = Toast.Style.Success;
      } else {
        await showToast({
          title: "Save your model...",
          style: Toast.Style.Animated,
        });
        use.models.add({
          ...updatedModel,
          id: uuidv4(),
          created_at: new Date().toISOString(),
        });
        await showToast({
          title: "Model saved",
          style: Toast.Style.Animated,
        });
      }
      pop();
    },
    validation: {
      name: FormValidation.Required,
      option: FormValidation.Required,
      temperature: (value) => {
        if (value === undefined || value === null || value === "") {
          return "Temperature is required";
        }
        const numValue = Number(value);
        if (Number.isNaN(numValue)) {
          return "Temperature must be a number";
        }
        if (numValue < 0) {
          return "Minimal value is 0";
        }
        if (numValue > 1) {
          return "Maximum value is 1";
        }
        return undefined; // Valid input
      },
      max_tokens: (value) => {
        if (value === undefined || value === null || value === "") {
          return "Max tokens is required";
        }
        const numValue = Number(value);
        if (Number.isNaN(numValue)) {
          return "Max tokens must be a number";
        }
        if (numValue % 1 !== 0) {
          return "Value must be an integer";
        }
        if (numValue <= 0) {
          return "Value must be greater than 0";
        }
        return undefined; // Valid input
      },
    },
    initialValues: {
      name: model?.name ?? props.name ?? "",
      temperature: model?.temperature.toString() ?? "1",
      max_tokens: model?.max_tokens ?? "4096",
      option: defaultModelOption,
      prompt: model?.prompt ?? "You are a useful assistant",
      pinned: model?.pinned ?? false,
    },
  });

  const { isLoading, data } = useFetch<CSVPrompt[]>(
    "https://gist.githubusercontent.com/florisdobber/35f702f0bab6816ac847b182be6f4903/raw/2f6a8296dc5818d76ed594b318e064f9983e0715/prompts.csv",
    {
      parseResponse: async (response) => {
        const text = await response.text();
        return parse(text, {
          columns: true,
        });
      },
      keepPreviousData: true,
    }
  );

  const setPrompt = useCallback(
    (value: string) => {
      if (value !== "none") {
        setValue("prompt", value);
      }
    },
    [setValue]
  );

  const [showAnthropicPrompts, setShowAnthropicPrompts] = useState(false);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
          <Action title="Show Anthropic Prompts" icon={Icon.Book} onAction={() => setShowAnthropicPrompts((s) => !s)} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Model ID" placeholder="Enter the provider model identifier" {...itemProps.option} />
      <Form.TextField title="Name" placeholder="Name your model" {...itemProps.name} />
      {showAnthropicPrompts && (
        <Form.Dropdown
          id="template"
          title="Anthropic Prompts"
          isLoading={isLoading}
          defaultValue="none"
          onChange={setPrompt}
        >
          <Form.Dropdown.Item value="none" title="Choose an Anthropic Library Prompt" icon={Icon.Book} />
          {(data || []).map((prompt) => (
            <Form.Dropdown.Item value={prompt.prompt} title={prompt.name} key={prompt.prompt} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea title="Prompt" placeholder="Describe your prompt" {...itemProps.prompt} />
      <Form.TextField
        title="Temperature"
        placeholder="Set your sampling temperature (0 - 1)"
        {...itemProps.temperature}
      />
      <Form.TextField
        title="Max token output"
        placeholder="Set the maximum number of tokens to generate"
        {...itemProps.max_tokens}
      />
      {model?.id !== "default" && <Form.Checkbox title="Pinned" label="Pin model" {...itemProps.pinned} />}
    </Form>
  );
};
