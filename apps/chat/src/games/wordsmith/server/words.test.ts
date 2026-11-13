import { describe, expect, it } from "vitest";
import { ANSWERS } from "./answers";
import { getAnswer } from "./words";

function gameDates(count: number) {
  const dates: string[] = [];
  const day = new Date("2026-11-16T12:00:00Z");
  while (dates.length < count) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      dates.push(day.toISOString().slice(0, 10));
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}

describe("getAnswer", () => {
  it("uses every answer once before repeating", () => {
    const words = gameDates(ANSWERS.length).map(getAnswer);
    expect(new Set(words).size).toBe(ANSWERS.length);
  });

  it("isn't the committed list order", () => {
    const words = gameDates(20).map(getAnswer);
    const start = ANSWERS.indexOf(words[0]);
    const inListOrder = words.every(
      (w, i) => w === ANSWERS[(start + i) % ANSWERS.length],
    );
    expect(inListOrder).toBe(false);
  });
});
