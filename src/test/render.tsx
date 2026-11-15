import "@testing-library/jest-dom/vitest";
import type { ReactElement, ReactNode } from "react";
import { render, renderHook, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BabyContext,
  type BabyContextValue,
} from "@/components/providers/BabyProvider";
import {
  UserProfileContext,
  type UserProfileContextValue,
} from "@/components/providers/UserProfileProvider";

interface Options extends Omit<RenderOptions, "wrapper"> {
  /** When given, wraps the UI in a BabyContext with these values. */
  baby?: Partial<BabyContextValue>;
  /** When given, wraps the UI in a UserProfileContext with these values. */
  profile?: Partial<UserProfileContextValue>;
  queryClient?: QueryClient;
}

type ProviderOptions = Pick<Options, "baby" | "profile" | "queryClient">;

function createProviders(opts: ProviderOptions) {
  const { baby, profile, queryClient } = opts;
  const client =
    queryClient ??
    new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function Wrapper({ children }: { children: ReactNode }) {
    let tree = <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    if (profile) {
      const value: UserProfileContextValue = {
        profile: null,
        isLoading: false,
        isNannyMode: false,
        refreshProfile: async () => {},
        ...profile,
      };
      tree = (
        <UserProfileContext.Provider value={value}>{tree}</UserProfileContext.Provider>
      );
    }
    if (baby) {
      const value: BabyContextValue = {
        babies: [],
        activeBaby: null,
        setActiveBaby: () => {},
        isLoading: false,
        ...baby,
      };
      tree = <BabyContext.Provider value={value}>{tree}</BabyContext.Provider>;
    }
    return tree;
  }

  return { client, Wrapper };
}

export function renderWithProviders(ui: ReactElement, opts: Options = {}) {
  const { baby, profile, queryClient, ...rest } = opts;
  const { client, Wrapper } = createProviders({ baby, profile, queryClient });
  return { queryClient: client, ...render(ui, { wrapper: Wrapper, ...rest }) };
}

/** renderHook counterpart of {@link renderWithProviders}. */
export function renderHookWithProviders<R, P = undefined>(
  hook: (props: P) => R,
  opts: ProviderOptions & { initialProps?: P } = {}
) {
  const { initialProps, ...providers } = opts;
  const { client, Wrapper } = createProviders(providers);
  return {
    queryClient: client,
    ...renderHook(hook, { wrapper: Wrapper, initialProps }),
  };
}
