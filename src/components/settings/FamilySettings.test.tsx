// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { renderWithProviders } from "@/test/render";
import { settle, stable } from "@/test/dom";
import { buildInviteLink } from "@/lib/invites/inviteLink";
import { FamilySettings } from "./FamilySettings";

// framer-motion swapped for plain elements (see src/test/motion.tsx).
vi.mock("framer-motion", () => import("@/test/motion"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const ME = "user-1";
const members = [
  {
    id: "m-1",
    baby_id: "baby-1",
    user_id: ME,
    role: "owner",
    display_name: "Ana Souza",
    email: "ana@example.com",
    family_relation: "mae",
  },
  {
    id: "m-2",
    baby_id: "baby-1",
    user_id: "user-2",
    role: "caregiver",
    display_name: null,
    email: "bia@example.com",
    family_relation: "baba",
  },
  {
    id: "m-3",
    baby_id: "baby-1",
    user_id: "user-3",
    role: "viewer",
    display_name: "Carlos",
    email: "carlos@example.com",
    family_relation: null,
  },
];
const invites = [
  {
    id: "inv-1",
    baby_id: "baby-1",
    role: "viewer",
    family_relation: "avo",
    expires_at: "2026-01-08T12:00:00.000Z",
    token: "old",
  },
];

type Handler = (
  method: string,
  url: string,
  body: unknown
) => Response | Promise<Response> | undefined;
let handler: Handler;
let calls: string[];
let fetchMock: ReturnType<typeof vi.fn>;
let writeText: ReturnType<typeof vi.fn>;

function api(role: string, overrides: Handler = () => undefined): Handler {
  return (method, url, body) => {
    const custom = overrides(method, url, body);
    if (custom) return custom;
    if (method === "GET" && url.startsWith("/api/family/members")) {
      return Response.json({ data: members, currentUserRole: role });
    }
    if (method === "GET" && url.startsWith("/api/family/invite")) {
      return Response.json({ data: invites });
    }
    return Response.json({});
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
  calls = [];
  handler = api("owner");
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push(`${method} ${url}${body ? ` ${JSON.stringify(body)}` : ""}`);
    return await handler(method, url, body)!;
  });
  vi.stubGlobal("fetch", fetchMock);
  writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function mount() {
  const view = renderWithProviders(<FamilySettings babyId="baby-1" currentUserId={ME} />);
  await screen.findByText("Ana Souza");
  await settle();
  return view;
}

describe("FamilySettings", () => {
  it("renders_members_and_invites", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    handler = api("owner", (method, url) =>
      url.startsWith("/api/family/members")
        ? gate.then(() => Response.json({ data: members, currentUserRole: "owner" }))
        : undefined
    );
    const { container } = renderWithProviders(
      <FamilySettings babyId="baby-1" currentUserId={ME} />
    );
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
    expect(stable(container)).toMatchSnapshot("loading");
    release();

    await screen.findByText("Ana Souza");
    expect(screen.getByText("(você)")).toBeInTheDocument();
    expect(screen.getByText("bia@example.com")).toBeInTheDocument();
    expect(screen.getByText("Convidar")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Convites pendentes (1)" }));
    expect(await screen.findByText(/Expira em/)).toHaveTextContent("Expira em 08/01/2026");
    await settle();
    expect(stable(container)).toMatchSnapshot("owner");
    expect(calls).toEqual([
      "GET /api/family/members?babyId=baby-1",
      "GET /api/family/invite?babyId=baby-1",
    ]);
  });

  it("renders_non_owner_view", async () => {
    handler = api("viewer");
    const { container } = renderWithProviders(
      <FamilySettings babyId="baby-1" currentUserId="user-3" />
    );
    await screen.findByText("Carlos");
    await settle();
    expect(screen.queryByText("Convidar")).not.toBeInTheDocument();
    expect(screen.queryByText(/Convites pendentes/)).not.toBeInTheDocument();
    // Only the member's own "leave" button.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(stable(container)).toMatchSnapshot("viewer");
  });

  it("generates_invite_link", async () => {
    handler = api("owner", (method, url) =>
      method === "POST" && url === "/api/family/invite"
        ? Response.json({ data: { token: "ab/c+d=" } })
        : undefined
    );
    const { container } = await mount();
    fireEvent.click(screen.getByRole("button", { name: "Só visualizar" }));
    fireEvent.click(screen.getByRole("button", { name: "Gerar link de convite" }));

    const link = buildInviteLink(window.location.origin, "ab/c+d=");
    expect(await screen.findByText(link)).toBeInTheDocument();
    expect(screen.getByText(/Válido por 7 dias/)).toHaveTextContent("Válido por 7 dias · Só visualizar");
    await waitFor(() => expect(calls).toHaveLength(4));
    expect(calls.slice(2)).toEqual([
      'POST /api/family/invite {"babyId":"baby-1","role":"viewer","familyRelation":null}',
      "GET /api/family/invite?babyId=baby-1",
    ]);
    expect(stable(container)).toMatchSnapshot("link");

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }));
    expect(await screen.findByRole("button", { name: "Copiado!" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(link);
  });

  it("generate_invite_link_shows_server_error", async () => {
    handler = api("owner", (method) =>
      method === "POST" ? Response.json({ error: "Limite de convites" }, { status: 429 }) : undefined
    );
    await mount();
    fireEvent.click(screen.getByRole("button", { name: "Gerar link de convite" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Limite de convites"));
    expect(screen.getByRole("button", { name: "Gerar link de convite" })).toBeEnabled();
    expect(screen.queryByText(/Válido por 7 dias/)).not.toBeInTheDocument();
  });

  it("revokes_invite", async () => {
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: "Convites pendentes (1)" }));
    const row = (await screen.findByText(/Expira em/)).closest("div.flex") as HTMLElement;
    fireEvent.click(row.querySelector("button")!);
    await waitFor(() => expect(screen.queryByText(/Convites pendentes/)).not.toBeInTheDocument());
    expect(calls).toContain("DELETE /api/family/invite?inviteId=inv-1&babyId=baby-1");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("removes_member", async () => {
    await mount();
    const row = screen.getByText("Carlos").closest("div.flex") as HTMLElement;
    fireEvent.click(row.querySelector("button")!);
    await screen.findByRole("dialog");
    expect(screen.getByText("Remover membro?")).toBeInTheDocument();
    expect(screen.getByText("Carlos perderá o acesso ao bebê.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    await waitFor(() => expect(screen.queryByText("Carlos")).not.toBeInTheDocument());
    expect(calls).toContain("DELETE /api/family/members?babyId=baby-1&userId=user-3");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("removes_member_shows_server_error", async () => {
    handler = api("owner", (method) =>
      method === "DELETE" ? Response.json({ error: "Sem permissão" }, { status: 403 }) : undefined
    );
    await mount();
    const row = screen.getByText("Carlos").closest("div.flex") as HTMLElement;
    fireEvent.click(row.querySelector("button")!);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Sem permissão"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });
});
