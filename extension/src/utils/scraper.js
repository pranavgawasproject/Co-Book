// Remote Adapter Pattern - DOM Scraper Utility
// NO HARDCODED RULES - ALL SELECTORS FETCHED FROM SUPABASE

export async function extractPropertyData(selectors) {
  const extractedData = {};
  if (!selectors) return extractedData;

  for (const [key, rule] of Object.entries(selectors)) {
    if (rule.strategy === 'meta') {
      const el = document.querySelector(rule.path);
      if (el) extractedData[key] = el.getAttribute(rule.attribute);
    }
    else if (rule.strategy === 'dom') {
      const paths = [rule.path];
      if (rule.fallback) {
        paths.push(...rule.fallback.split(',').map(s => s.trim()));
      }

      let found = false;
      for (const sel of paths) {
        if (found || !sel) continue;

        const elements = document.querySelectorAll(sel);
        for (const el of elements) {
          const text = el.innerText || el.textContent;
          if (!text) continue;

          if (rule.regexMatch) {
            const match = text.match(new RegExp(rule.regexMatch));
            if (match) {
              let matchedStr = match[0];
              if (rule.removeChars) {
                rule.removeChars.forEach(char => {
                  matchedStr = matchedStr.split(char).join('');
                });
              }
              const sanitizedStr = matchedStr.replace(/,/g, '');
              const parsed = parseFloat(sanitizedStr);
              if (!isNaN(parsed) && parsed > 0) {
                extractedData[key] = parsed;
                found = true;
                break;
              }
            }
          } else {
            extractedData[key] = text;
            found = true;
            break;
          }
        }
      }
    }
  }

  return extractedData;
}

export function getDomainForCurrentPage(targetUrl = null) {
  const url = targetUrl || (typeof window !== 'undefined' ? window.location?.href : '');
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

