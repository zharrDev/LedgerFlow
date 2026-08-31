import { Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AppShellConfigProvider } from "../context/AppShellConfigContext";

export function AppLayout() {
  return (
    <AppShellConfigProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </AppShellConfigProvider>
  );
}
