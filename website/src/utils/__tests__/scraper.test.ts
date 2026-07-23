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

  test('should return null for invalid text or non-numeric strings', () => {
    expect(parsePriceFromText("Sold Out", defaultRegexMatch, defaultRemoveChars)).toBeNull();
    expect(parsePriceFromText("", defaultRegexMatch, defaultRemoveChars)).toBeNull();
  });
});

/**
 * Pure domain detection helper replicating extension scraper domain logic for unit testing.
 */
function getDomainForCurrentPage(url: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('airbnb.')) return 'airbnb';
  if (lowerUrl.includes('makemytrip.com') || lowerUrl.includes('makemytrip.')) return 'makemytrip';
  if (lowerUrl.includes('booking.com')) return 'booking';
  if (lowerUrl.includes('expedia.')) return 'expedia';
  if (lowerUrl.includes('agoda.com')) return 'agoda';
  if (lowerUrl.includes('vrbo.com')) return 'vrbo';
  if (lowerUrl.includes('trip.com')) return 'trip';
  return null;
}

describe('Co-Book Scraper Domain Detection', () => {
  test('should detect airbnb URLs correctly', () => {
    expect(getDomainForCurrentPage('https://www.airbnb.com/rooms/12345')).toBe('airbnb');
    expect(getDomainForCurrentPage('https://www.airbnb.co.in/rooms/67890')).toBe('airbnb');
  });

  test('should detect MakeMyTrip URLs correctly', () => {
    expect(getDomainForCurrentPage('https://www.makemytrip.com/hotels/hotel-detail')).toBe('makemytrip');
  });

  test('should detect Booking, Expedia, Agoda, Vrbo, Trip.com URLs correctly', () => {
    expect(getDomainForCurrentPage('https://www.booking.com/hotel/in/villas.html')).toBe('booking');
    expect(getDomainForCurrentPage('https://www.expedia.com/Hotels')).toBe('expedia');
    expect(getDomainForCurrentPage('https://www.agoda.com/resort/pages')).toBe('agoda');
    expect(getDomainForCurrentPage('https://www.vrbo.com/12345')).toBe('vrbo');
    expect(getDomainForCurrentPage('https://www.trip.com/hotels')).toBe('trip');
  });

  test('should return null for unsupported or invalid URLs', () => {
    expect(getDomainForCurrentPage('https://www.google.com')).toBeNull();
    expect(getDomainForCurrentPage('')).toBeNull();
    expect(getDomainForCurrentPage(null)).toBeNull();
  });
});

