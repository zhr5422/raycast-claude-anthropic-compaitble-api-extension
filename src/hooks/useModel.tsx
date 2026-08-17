import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Model, ModelHook } from "../type";
import { createDefaultModel, DEFAULT_MODEL_ID, resolveStoredModels } from "../model-config";

async function getStoredModels(defaultModel: Model): Promise<Model[]> {
  const storedModels = await LocalStorage.getItem<string>("models");
  return resolveStoredModels(storedModels, defaultModel);
}

export function useModel(): ModelHook {
  const [defaultModel] = useState(() => {
    const { defaultModel } = getPreferenceValues<{ defaultModel: string }>();
    return createDefaultModel(defaultModel);
  });
  const [data, setData] = useState<Model[]>([defaultModel]);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getStoredModels(defaultModel)
      .then(setData)
      .catch((error) => {
        console.error("Error loading models:", error);
        setData([defaultModel]);
      })
      .finally(() => setLoading(false));
  }, [defaultModel]);

  const add = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Saving your model...",
        style: Toast.Style.Animated,
      });
      const newModel: Model = { ...model, created_at: new Date().toISOString() };
      setData((prevData) => {
        const newData = [...prevData, newModel];
        LocalStorage.setItem("models", JSON.stringify(newData));
        return newData;
      });
      toast.title = "Model saved!";
      toast.style = Toast.Style.Success;
    },
    [setData]
  );

  const update = useCallback(
    async (model: Model) => {
      setData((prevData) => {
        const newModels = prevData.map((x) => {
          if (x.id === model.id) {
            return model;
          }
          return x;
        });
        LocalStorage.setItem("models", JSON.stringify(newModels));
        return newModels;
      });
    },
    [setData]
  );

  const remove = useCallback(
    async (model: Model) => {
      const toast = await showToast({
        title: "Removing your model...",
        style: Toast.Style.Animated,
      });
      setData((prevData) => {
        const newModels = prevData.filter((oldModel) => oldModel.id !== model.id);
        LocalStorage.setItem("models", JSON.stringify(newModels));
        return newModels;
      });
      toast.title = "Model removed!";
      toast.style = Toast.Style.Success;
    },
    [setData]
  );

  const clear = useCallback(async () => {
    const toast = await showToast({
      title: "Clearing your models...",
      style: Toast.Style.Animated,
    });
    setData((prevData) => {
      const newModels: Model[] = prevData.filter((oldModel) => oldModel.id === DEFAULT_MODEL_ID);
      LocalStorage.setItem("models", JSON.stringify(newModels));
      return newModels;
    });
    toast.title = "Models cleared!";
    toast.style = Toast.Style.Success;
  }, [setData]);

  return useMemo(
    () => ({ data, defaultModel, isLoading, add, update, remove, clear }),
    [data, defaultModel, isLoading, add, update, remove, clear]
  );
}
