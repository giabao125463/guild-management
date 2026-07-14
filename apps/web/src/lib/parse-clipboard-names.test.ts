import { describe, expect, it } from "vitest";
import { parseClipboardNames } from "./parse-clipboard-names";

describe("parseClipboardNames", () => {
  it("parses one name per line", () => {
    expect(parseClipboardNames("Alice\nBob\n")).toEqual(["Alice", "Bob"]);
  });

  it("parses tabular name column", () => {
    expect(parseClipboardNames("name\nAlice\nBob")).toEqual(["Alice", "Bob"]);
  });

  it("parses tabular second column as name", () => {
    expect(parseClipboardNames("M001\tAlice\nM002\tBob")).toEqual(["Alice", "Bob"]);
  });

  it("deduplicates names", () => {
    expect(parseClipboardNames("Alice\nAlice\nBob")).toEqual(["Alice", "Bob"]);
  });
});
