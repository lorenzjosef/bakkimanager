interface EnsureSchemaInitializedOptions {
  getSchemaInitPromise: () => Promise<void> | null;
  initialize: () => Promise<void>;
  isConfigured: boolean;
  schemaEnsured: boolean;
  setSchemaInitPromise: (promise: Promise<void> | null) => void;
}

export async function ensureSchemaInitialized({
  getSchemaInitPromise,
  initialize,
  isConfigured,
  schemaEnsured,
  setSchemaInitPromise,
}: EnsureSchemaInitializedOptions) {
  if (schemaEnsured || !isConfigured) {
    return;
  }

  const existingPromise = getSchemaInitPromise();
  if (existingPromise) {
    await existingPromise;
    return;
  }

  const initPromise = initialize();
  setSchemaInitPromise(initPromise);
  initPromise.catch(() => {
    if (getSchemaInitPromise() === initPromise) {
      setSchemaInitPromise(null);
    }
  });

  await initPromise;
}
