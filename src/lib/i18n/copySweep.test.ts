import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");

/** Every non-test source file under src/, minus the landing (out of this redesign). */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__snapshots__" || name === "landing" || name === "test") return [];
      return sourceFiles(full);
    }
    if (!/\.(tsx?|html)$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    return [full];
  });
}

describe("copy sweep", () => {
  it("no screen, toast or e-mail says 'Configurações' (the screen is 'Mais')", () => {
    const hits = sourceFiles(SRC)
      .filter((f) => /configurações/i.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    expect(hits).toEqual([]);
  });

  it("screens, e-mails and the PDF never print a decimal with toFixed (it uses a dot)", () => {
    const displays = [
      "components/home/SleepingCard.tsx",
      "components/sleep/environment/TempStepper.tsx",
      "components/sleep/environment/TogSelector.tsx",
      "emails/WeeklyReport.tsx",
      "lib/report/SleepReportPdf.tsx",
    ];
    const hits = displays.filter((f) => /\.toFixed\(/.test(readFileSync(join(SRC, f), "utf8")));
    expect(hits).toEqual([]);
  });
});
