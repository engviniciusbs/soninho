// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Baby } from "@/types";
import { BabyProfileForm } from "./BabyProfileForm";

const save = vi.fn(async (values: unknown) => Boolean(values));
vi.mock("@/hooks/settings/useBabySettings", () => ({
  useBabySettings: () => ({ save, uploadAvatar: vi.fn(), isSaving: false, isUploading: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const lia = {
  id: "b1",
  name: "Lia",
  birth_date: "2026-02-10",
  avatar_emoji: "🍼",
  avatar_url: null,
  sex: "F",
} as Baby;

function open(baby: Baby | null) {
  render(<BabyProfileForm open onOpenChange={() => {}} baby={baby} session={1} />);
}

describe("BabyProfileForm sex field", () => {
  it("offers Menina, Menino and Não informar, starting from the stored value", () => {
    open(lia);
    const group = screen.getByRole("radiogroup", { name: "Sexo" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Menina" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Menino" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Não informar" })).toHaveAttribute("aria-checked", "false");
  });

  it("a baby without sex starts on Não informar", () => {
    open({ ...lia, sex: null });
    expect(screen.getByRole("radio", { name: "Não informar" })).toHaveAttribute("aria-checked", "true");
  });

  it("saves the choice; Não informar saves null", async () => {
    open(lia);
    fireEvent.click(screen.getByRole("radio", { name: "Menino" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    });
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ id: "b1", sex: "M" }));

    fireEvent.click(screen.getByRole("radio", { name: "Não informar" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    });
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ id: "b1", sex: null }));
  });
});

describe("BabyProfileForm in the design system (spec #21)", () => {
  it("every field is tied to its visible label", () => {
    open(lia);
    expect(screen.getByLabelText("Nome")).toHaveValue("Lia");
    expect(screen.getByLabelText("Data de nascimento")).toHaveValue("2026-02-10");
    const group = screen.getByRole("radiogroup", { name: "Sexo" });
    const label = screen.getByText("Sexo");
    expect(label).not.toHaveAttribute("aria-hidden");
    expect(group).toHaveAttribute("aria-labelledby", label.id);
  });

  it("the title follows the pattern of the other forms", () => {
    open(null);
    const title = screen.getByRole("heading", { name: "Adicionar bebê" });
    expect(title).toHaveClass("font-display");
  });
});
