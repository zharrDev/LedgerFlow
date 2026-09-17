import { useSyncExternalStore } from "react";
import { Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AppShellConfigProvider } from "../context/AppShellConfigContext";
import { subscribeCurrency, getCurrencySnapshot } from "../utils/currency";

export function AppLayout() {
  // Me-remount isi aplikasi saat mata uang diganti di Settings agar seluruh
  // angka terformat ulang dalam mata uang baru (format dibaca saat render).
  const currencyCode = useSyncExternalStore(subscribeCurrency, getCurrencySnapshot);
  return (
    <AppShellConfigProvider>
      <AppShell key={currencyCode}>
        <Outlet />
      </AppShell>
    </AppShellConfigProvider>
  );
}
