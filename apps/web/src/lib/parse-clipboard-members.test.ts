import { describe, expect, it } from "vitest";
import { GameClass } from "@guild/shared-types";
import { parseGameClass } from "@guild/shared-utils";
import {
  isTabularClipboardData,
  parseClipboardMembers,
  parseClipboardMembersDetailed,
} from "./parse-clipboard-members";

describe("parseGameClass aliases", () => {
  it.each([
    ["TV", GameClass.TO_VAN],
    ["Tố", GameClass.TO_VAN],
    ["Tố vấn", GameClass.TO_VAN],
    ["TY", GameClass.THIET_Y],
    ["Thiết", GameClass.THIET_Y],
    ["Thiết y", GameClass.THIET_Y],
    ["HH", GameClass.HUYET_HA],
    ["TT", GameClass.THAN_TUONG],
    ["CL", GameClass.CUU_LINH],
    ["TM", GameClass.TOAI_MONG],
    ["LN", GameClass.LONG_NGAM],
  ])("maps %s to %s", (input, expected) => {
    expect(parseGameClass(input)).toBe(expected);
  });
});

describe("parseClipboardMembers", () => {
  it("parses tab-separated rows", () => {
    const input = "1001\tAlice\tTố Vấn\n1002\tBob\tThiết Y\n1003\tCindy\tHuyết Hà";
    const rows = parseClipboardMembers(input);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      internalMemberId: "1001",
      currentName: "Alice",
      currentClass: GameClass.TO_VAN,
    });
  });

  it("handles windows and unix newlines", () => {
    const input = "1001\tAlice\tTV\r\n1002\tBob\tTY\n1003\tCindy\tHH\r";
    expect(parseClipboardMembers(input)).toHaveLength(3);
  });

  it("ignores empty rows and trailing tabs", () => {
    const input = "1001\tAlice\tTV\n\n\n1002\tBob\tTY\t\t\n   \n";
    expect(parseClipboardMembers(input)).toHaveLength(2);
  });

  it("supports id-only and id+name rows", () => {
    const input = "1001\tAlice\n1002\t";
    const rows = parseClipboardMembers(input);
    expect(rows[0]?.currentClass).toBe("");
    expect(rows[1]?.currentName).toBe("");
  });

  it("ignores columns beyond the third", () => {
    const input = "1001\tAlice\tTV\textra\tmore";
    expect(parseClipboardMembers(input)[0]?.currentName).toBe("Alice");
  });

  it("never throws on malformed input", () => {
    expect(parseClipboardMembers("")).toEqual([]);
    expect(parseClipboardMembers("not-tabular")).toEqual([
      expect.objectContaining({ internalMemberId: "not-tabular" }),
    ]);
  });

  it("marks invalid class rows", () => {
    const result = parseClipboardMembersDetailed("1001\tAlice\tINVALID_CLASS");
    expect(result.drafts).toHaveLength(0);
    expect(result.invalidRows).toHaveLength(1);
  });

  it("handles vietnamese characters", () => {
    const input = "1001\tNguyễn Văn A\tTố Vấn";
    const rows = parseClipboardMembers(input);
    expect(rows[0]?.currentName).toBe("Nguyễn Văn A");
  });
});

describe("isTabularClipboardData", () => {
  it("detects tabular clipboard content", () => {
    expect(isTabularClipboardData("1001\tAlice\tTV")).toBe(true);
    expect(isTabularClipboardData("plain text")).toBe(false);
  });
});
