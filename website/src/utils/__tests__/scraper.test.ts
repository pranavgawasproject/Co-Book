import { describe, test, expect } from 'vitest';

/**
 * Pure DOM extraction helper replicating extension scraper parsing logic for unit testing.
 */
function parsePriceFromText(text: string, regexMatch: string, removeChars: string[] = []): number | null {
  if (!text) return null;

  const match = text.match(new RegExp(regexMatch));
  if (match) {
    let matchedStr = match[0];
    if (removeChars && removeChars.length > 0) {
      removeChars.forEach(char => {
        matchedStr = matchedStr.split(char).join('');
      });
    }

    const sanitizedStr = matchedStr.replace(/,/g, '');
    const parsed = parseFloat(sanitizedStr);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

describe('Co-Book Scraper Price Extraction', () => {
  const defaultRemoveChars = [",", "₹", "$", " ", "total", "payable", "\n", "for", "nights", "night"];
  const defaultRegexMatch = "[0-9.,]+";

  test('should correctly parse thousands with commas without truncating at comma', () => {
    const text = "₹50,000 total for 3 nights";
    const price = parsePriceFromText(text, defaultRegexMatch, defaultRemoveChars);
    expect(price).toBe(50000);
  });

  test('should parse large amounts like ₹1,25,000 or $12,500.50', () => {
    expect(parsePriceFromText("$12,500.50", defaultRegexMatch, defaultRemoveChars)).toBe(12500.50);
    expect(parsePriceFromText("₹1,25,000", defaultRegexMatch, defaultRemoveChars)).toBe(125000);
  });

  test('should handle simple numbers without symbols', () => {
    expect(parsePriceFromText("18000", defaultRegexMatch, defaultRemoveChars)).toBe(18000);
  });

  test('should return null for invalid text or non-numeric strings', () => {
    expect(parsePriceFromText("Sold Out", defaultRegexMatch, defaultRemoveChars)).toBeNull();
    expect(parsePriceFromText("", defaultRegexMatch, defaultRemoveChars)).toBeNull();
  });
});
