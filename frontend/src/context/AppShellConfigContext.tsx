import { createContext, useContext, useState, useEffect } from "react";

type AppShellConfig = {
  title?: string;
  description?: string;
  fullHeight?: boolean;
  hideTitle?: boolean;
};

const AppShellConfigContext = createContext<AppShellConfig>({});
const AppShellConfigSetterContext = createContext<
  (config: AppShellConfig) => void
>(() => {});

export function AppShellConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<AppShellConfig>({});

  // Reset config on route change so stale config doesn't persist
  useEffect(() => {
    setConfig({});
  }, []);

  return (
    <AppShellConfigSetterContext.Provider value={setConfig}>
      <AppShellConfigContext.Provider value={config}>
        {children}
      </AppShellConfigContext.Provider>
    </AppShellConfigSetterContext.Provider>
  );
}

export function useSetAppShellConfig() {
  const setConfig = useContext(AppShellConfigSetterContext);
  return setConfig;
}

export function useAppShellConfig() {
  return useContext(AppShellConfigContext);
}
