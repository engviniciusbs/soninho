// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ListRow } from "./list-row";

afterEach(cleanup);

describe("ListRow", () => {
  it("renders a link with the href and the title", () => {
    render(<ListRow href="/more/family" title="Família" />);
    const link = screen.getByRole("link", { name: /Família/ });
    expect(link).toHaveAttribute("href", "/more/family");
    expect(screen.getByTestId("list-row-chevron")).toBeInTheDocument();
  });

  it("does not show the chevron when there is a value", () => {
    render(<ListRow href="/feeding" title="Peito" value="40 min" />);
    expect(screen.getByText("40 min")).toBeInTheDocument();
    expect(screen.queryByTestId("list-row-chevron")).toBeNull();
  });
});
