// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BabyAvatar } from "./BabyAvatar";

const EMOJI = /\p{Extended_Pictographic}/u;

afterEach(cleanup);

describe("BabyAvatar", () => {
  it("shows the uppercase initial and labels the avatar with the name", () => {
    const { container } = render(<BabyAvatar name="Lua" />);
    expect(screen.getByLabelText("Lua")).toBeInTheDocument();
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(EMOJI);
  });

  it("uppercases a lowercase initial", () => {
    render(<BabyAvatar name="theo" />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("shows the photo with the name as alt text", () => {
    const { container } = render(
      <BabyAvatar name="Lua" avatarUrl="https://x.supabase.co/storage/v1/object/public/a.png" />
    );
    expect(screen.getByRole("img", { name: "Lua" }).tagName).toBe("IMG");
    expect(screen.queryByText("L")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(EMOJI);
  });

  it("shows the moon icon and no text without a name", () => {
    const { container } = render(<BabyAvatar name="" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.textContent).toBe("");
    expect(container.textContent).not.toMatch(EMOJI);
  });

  it("home size is a real 56px circle", () => {
    render(<BabyAvatar name="Lua" size="home" />);
    expect(screen.getByLabelText("Lua")).toHaveClass("size-14");
  });
});
