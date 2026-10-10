export interface DesktopEnvironment {
  version: string;
  defaultLearningFolder: string;
  gitAvailable: boolean;
  keyManaged: boolean;
  hasSavedKey: boolean;
}
export interface DesktopBridge {
  environment(): Promise<DesktopEnvironment>;
  chooseFolder(): Promise<string | null>;
  setApiKey(key: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  openExtensionFolder(): Promise<void>;
}
declare global {
  interface Window {
    gitLearnDesktop?: DesktopBridge;
  }
}
