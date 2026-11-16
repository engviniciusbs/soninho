// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { LandingPage } from "./LandingPage";

// framer-motion swapped for plain elements (see src/test/motion.tsx): real
// motion values/animations make inline styles timing-dependent.
vi.mock("framer-motion", () => import("@/test/motion"));

beforeEach(() => {
  // Footer prints the current year.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("LandingPage", () => {
  it("renders_landing_sections", () => {
    const { container } = render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Menos adivinhação. Mais noites calmas."
    );
    expect(screen.getByRole("heading", { level: 2, name: "Um ritual que cabe no colo." })).toBeInTheDocument();
    for (const title of ["Iniciou.", "Entendeu.", "Compartilhou."]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { level: 2, name: "Dorme o bebê.Descansa a cabeça." })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Criar conta grátis" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Já tem conta → entrar" })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(screen.getByText("Feito com carinho no Brasil · 2026")).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
