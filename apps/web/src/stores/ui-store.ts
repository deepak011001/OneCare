import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UiState = {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandPaletteOpen: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  setMobileNavOpen: (value: boolean) => void;
  setCommandPaletteOpen: (value: boolean) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandPaletteOpen: false,
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    }),
    {
      name: 'onecare.ui',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
