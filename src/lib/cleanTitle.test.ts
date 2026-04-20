import { describe, it, expect } from "vitest";
import { cleanListingTitle, extractSearchQuery } from "./cleanTitle";

describe("cleanListingTitle", () => {
  describe("RC preservation", () => {
    it("keeps RC in output", () => {
      const result = cleanListingTitle("ANTHONY EDWARDS 2020 Prizm Basketball RC!");
      expect(result).toContain("RC");
    });

    it("strips 'Rookie Card' but keeps RC", () => {
      const result = cleanListingTitle("Luka Doncic Rookie Card RC #280");
      expect(result).toContain("RC");
      expect(result).not.toMatch(/Rookie Card/i);
    });
  });

  describe("# to / conversion", () => {
    it("converts #256 to /256", () => {
      const result = cleanListingTitle("Prizm #256 Silver");
      expect(result).toContain("/256");
      expect(result).not.toContain("#256");
    });

    it("converts #45 to /45", () => {
      const result = cleanListingTitle("Card #45 Refractor");
      expect(result).toContain("/45");
    });
  });

  describe("variant words preserved", () => {
    it("keeps Version", () => {
      expect(cleanListingTitle("Green Version Prizm")).toContain("Version");
    });

    it("keeps Ver", () => {
      expect(cleanListingTitle("Holo Ver Charizard")).toContain("Ver");
    });
  });

  describe("product identifiers preserved", () => {
    it("keeps PRIZM, CHROME, OPTIC", () => {
      const result = cleanListingTitle("2023 PRIZM CHROME OPTIC Player");
      expect(result).toContain("PRIZM");
      expect(result).toContain("CHROME");
      expect(result).toContain("OPTIC");
    });
  });

  describe("existing stripping", () => {
    it("strips grading labels", () => {
      expect(cleanListingTitle("PSA 10 Gem Mint Card")).not.toMatch(/PSA 10/i);
    });

    it("strips sport categories", () => {
      expect(cleanListingTitle("Basketball Football Soccer")).toBe("");
    });

    it("strips filler words", () => {
      const result = cleanListingTitle("lot repack mystery bundle");
      expect(result).toBe("");
    });

    it("strips emojis", () => {
      expect(cleanListingTitle("🔥 Great Card 🏀")).not.toMatch(/🔥|🏀/);
    });
  });
});

describe("extractSearchQuery", () => {
  it("caps output at maxWords", () => {
    const input = "One Two Three Four Five Six Seven Eight Nine Ten";
    const result = extractSearchQuery(input, 5);
    expect(result.split(/\s+/).length).toBeLessThanOrEqual(5);
  });

  it("defaults to 8 words", () => {
    const input = "A B C D E F G H I J K L";
    const result = extractSearchQuery(input);
    expect(result.split(/\s+/).length).toBeLessThanOrEqual(8);
  });
});
