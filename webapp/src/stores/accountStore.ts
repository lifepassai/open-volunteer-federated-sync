import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Account = {
  uid: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
  role?: string;
  bearerToken: string;
}

export type AccountState = {
  account: Account | null
  setAccount: (account: Account) => void
  logout: () => void
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      account: null,
      setAccount: (account) => set({ account }),
      logout: () => set({ account: null }),
    }),
    {
      name: 'ovfs.auth',
      version: 1,
      partialize: (state: AccountState) => ({ account: state.account }),
    },
  ),
)
