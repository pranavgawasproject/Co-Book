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
            let cleanedValue = text;
            if (rule.removeChars) {
              rule.removeChars.forEach(char => {
                cleanedValue = cleanedValue.split(char).join('');
              });
            }
            const match = cleanedValue.match(new RegExp(rule.regexMatch));
            if (match) {
              const parsed = parseFloat(match[0]);
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

export function getDomainForCurrentPage() {
  const url = window.location.href;
  if (url.includes('airbnb.')) return 'airbnb';
  if (url.includes('makemytrip.com')) return 'makemytrip';
  return null;
}
