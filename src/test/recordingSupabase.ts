import { vi } from "vitest";

/**
 * Supabase client stand-in that records every query chain verbatim, so tests
 * can assert the exact table, methods and arguments a component sends.
 * `from(t).update(p).eq("id", x)` is recorded as
 * `{ target: "t", ops: [["update", [p]], ["eq", ["id", x]]] }`; `rpc(name, args)`
 * as `{ target: "rpc:name", ops: [["rpc", [args]]] }`.
 * Each awaited chain resolves to `respond(chain)` (default `{ data: null, error: null }`).
 */
export type Op = [method: string, args: unknown[]];
export interface Chain {
  target: string;
  ops: Op[];
}
type Result = { data: unknown; error: unknown };

export interface RecordingSupabase {
  chains: Chain[];
  /** Chains on `target`, optionally only those containing `method`. */
  find: (target: string, method?: string) => Chain[];
  uploads: Array<{ bucket: string; path: string; file: unknown; opts: unknown }>;
  respond: (fn: (chain: Chain) => Result | undefined) => void;
  setUser: (user: { id: string } | null) => void;
  client: {
    from: (table: string) => unknown;
    rpc: (name: string, args: unknown) => unknown;
    auth: { getUser: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> };
    storage: { from: (bucket: string) => unknown };
  };
}

export function createRecordingSupabase(): RecordingSupabase {
  const chains: Chain[] = [];
  const uploads: RecordingSupabase["uploads"] = [];
  let responder: (chain: Chain) => Result | undefined = () => undefined;
  let user: { id: string } | null = { id: "user-1" };

  function chain(target: string, first?: Op): unknown {
    const c: Chain = { target, ops: first ? [first] : [] };
    chains.push(c);
    const proxy: unknown = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") {
            const result = responder(c) ?? { data: null, error: null };
            return (resolve: (r: Result) => unknown) => resolve(result);
          }
          return (...args: unknown[]) => {
            c.ops.push([String(prop), args]);
            return proxy;
          };
        },
      }
    );
    return proxy;
  }

  return {
    chains,
    uploads,
    find: (target, method) =>
      chains.filter((c) => c.target === target && (!method || c.ops.some(([m]) => m === method))),
    respond: (fn) => {
      responder = fn;
    },
    setUser: (u) => {
      user = u;
    },
    client: {
      from: (table) => chain(table),
      rpc: (name, args) => chain(`rpc:${name}`, ["rpc", [args]]),
      auth: {
        getUser: vi.fn(async () => ({ data: { user } })),
        signOut: vi.fn(async () => ({ error: null })),
      },
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, file: unknown, opts: unknown) => {
            uploads.push({ bucket, path, file, opts });
            return { data: { path }, error: null };
          },
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://cdn.test/${bucket}/${path}` },
          }),
        }),
      },
    },
  };
}
