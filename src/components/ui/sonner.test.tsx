// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { IconAlert, IconX } from "@/components/brand/icons";
import { Toaster } from "./sonner";

const holder = vi.hoisted(() => ({ icons: {} as Record<string, ReactElement> }));
vi.mock("sonner", () => ({
  Toaster: (props: { icons: Record<string, ReactElement> }) => {
    holder.icons = props.icons;
    return null;
  },
}));

describe("Toaster", () => {
  it("error_uses_the_brand_alert_icon_not_the_close_x", () => {
    render(<Toaster />);
    expect(holder.icons.error.type).toBe(IconAlert);
    expect(holder.icons.error.type).not.toBe(IconX);
  });
});
