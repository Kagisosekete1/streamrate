import { describe, expect, it } from "vitest";
import {
  buildReferralUrl,
  parseReferralCode,
  isValidReferralCode,
  referralCodeMatchesHandle,
} from "./referralLink";

describe("referral link", () => {
  it("builds a URL with the referral code", () => {
    expect(buildReferralUrl("https://streamrateapp.com", "kristinmorgue")).toBe(
      "https://streamrateapp.com/auth?ref=kristinmorgue"
    );
  });

  it("strips trailing slashes from origin", () => {
    expect(buildReferralUrl("https://streamrateapp.com/", "alice")).toBe(
      "https://streamrateapp.com/auth?ref=alice"
    );
  });

  it("parses the ref code back from a URL", () => {
    const url = buildReferralUrl("https://streamrateapp.com", "kristinmorgue");
    expect(parseReferralCode(url)).toBe("kristinmorgue");
  });

  it("returns null for non-auth paths", () => {
    expect(parseReferralCode("https://streamrateapp.com/profile?ref=abc")).toBeNull();
  });

  it("validates referral code format", () => {
    expect(isValidReferralCode("kristinmorgue")).toBe(true);
    expect(isValidReferralCode("user_1")).toBe(true);
    expect(isValidReferralCode("ab")).toBe(false);
    expect(isValidReferralCode("with-dash")).toBe(false);
    expect(isValidReferralCode(null)).toBe(false);
  });

  it("matches a referral code against the user's handle", () => {
    expect(referralCodeMatchesHandle("kristinmorgue", "kristinmorgue")).toBe(true);
    expect(referralCodeMatchesHandle("kristinmorgue", "KristinMorgue")).toBe(true);
    expect(referralCodeMatchesHandle("kristinmorgue1", "kristinmorgue")).toBe(true);
    expect(referralCodeMatchesHandle("someoneelse", "kristinmorgue")).toBe(false);
  });

  it("round-trips: built URL parses back to the same code that matches the handle", () => {
    const handle = "kristinmorgue";
    const code = "kristinmorgue";
    const url = buildReferralUrl("https://streamrateapp.com", code);
    const parsed = parseReferralCode(url);
    expect(parsed).toBe(code);
    expect(referralCodeMatchesHandle(parsed!, handle)).toBe(true);
  });
});