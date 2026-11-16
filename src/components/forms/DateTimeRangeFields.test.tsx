// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useForm } from "react-hook-form";
import { DateTimeRangeFields } from "./DateTimeRangeFields";
import { useTimeRangeValidation, type TimeRangeNames } from "./useTimeRangeValidation";

type Values = { sd: string; st: string; ed: string; et: string };
const NAMES: TimeRangeNames<Values> = { startDate: "sd", startTime: "st", endDate: "ed", endTime: "et" };
const MSG = "O fim não pode ser antes do início";
const VALID: Values = { sd: "2026-01-01", st: "08:00", ed: "2026-01-01", et: "09:00" };

function Harness(props: { enabled?: boolean; showEnd?: boolean; startLabels?: { date: string; time: string } }) {
  const form = useForm<Values>({ defaultValues: VALID });
  useTimeRangeValidation(form.control, NAMES, { clearErrors: form.clearErrors, enabled: props.enabled });
  return (
    <>
      <DateTimeRangeFields
        control={form.control}
        names={NAMES}
        showEnd={props.showEnd}
        startLabels={props.startLabels}
      />
      <button type="button" onClick={() => form.setError("et", { type: "server", message: "Outro erro" })}>
        other
      </button>
    </>
  );
}

const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const change = (id: string, value: string) => fireEvent.change(input(id), { target: { value } });

afterEach(cleanup);

describe("DateTimeRangeFields + useTimeRangeValidation", () => {
  it("renders the four fields with default labels", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Data início")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("Hora início")).toHaveValue("08:00");
    expect(screen.getByLabelText("Data fim")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("Hora fim")).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("hides the end row and uses custom start labels", () => {
    render(<Harness showEnd={false} startLabels={{ date: "Data", time: "Hora" }} />);
    expect(screen.getByLabelText("Data")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora")).toBeInTheDocument();
    expect(input("ed")).toBeNull();
    expect(input("et")).toBeNull();
  });

  it.each([
    ["sd", "2026-01-02"],
    ["st", "10:00"],
    ["ed", "2025-12-31"],
    ["et", "07:00"],
  ])("changing %s alone sets then clears the range error", async (id, invalid) => {
    render(<Harness />);
    change(id, invalid);
    expect(await screen.findByRole("alert")).toHaveTextContent(MSG);
    expect(input("et")).toHaveAttribute("aria-invalid", "true");
    change(id, VALID[id as keyof Values]);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("does nothing while disabled or while a field is empty", async () => {
    const { rerender } = render(<Harness enabled={false} />);
    change("ed", "2025-12-31");
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<Harness enabled />);
    expect(await screen.findByRole("alert")).toHaveTextContent(MSG);
    change("et", "");
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("keeps other errors on the end field", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "other" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Outro erro");
    change("st", "08:30");
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByRole("alert")).toHaveTextContent("Outro erro");
  });
});
