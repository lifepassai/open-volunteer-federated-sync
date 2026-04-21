import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SettingsState = {
  expertMode: boolean
  setExpertMode: (value: boolean) => void
  toggleExpertMode: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      expertMode: false,
      setExpertMode: (value) => set({ expertMode: value }),
      toggleExpertMode: () => set({ expertMode: !get().expertMode }),
    }),
    {
      name: 'ovfs.settings',
      version: 1,
    },
  ),
)

