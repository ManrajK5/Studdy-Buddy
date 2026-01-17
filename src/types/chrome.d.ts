declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (
          extensionId: string,
          message: unknown,
          optionsOrCallback?: unknown,
          callback?: unknown,
        ) => void;
      };
    };
  }
}

export {};
