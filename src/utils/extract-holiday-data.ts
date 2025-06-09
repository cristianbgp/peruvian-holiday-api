interface Holiday {
  dateString: string;
  date: Date;
  name: string;
}

/**
 * Parse a Spanish date string like "Miércoles 23 de julio" into a Date object
 * @param dateString The Spanish date string to parse
 * @returns A Date object representing the date
 */
function parseSpanishDate(dateString: string): Date {
  // Spanish month names to their numeric values (0-indexed for JavaScript Date)
  const spanishMonths: Record<string, number> = {
    enero: 0, // January
    febrero: 1, // February
    marzo: 2, // March
    abril: 3, // April
    mayo: 4, // May
    junio: 5, // June
    julio: 6, // July
    agosto: 7, // August
    septiembre: 8, // September
    octubre: 9, // October
    noviembre: 10, // November
    diciembre: 11, // December
  };

  // Extract day and month from the date string
  // Example format: "Miércoles 23 de julio"
  const regex = /(\d+)\s+de\s+(\w+)/i;
  const match = dateString.match(regex);

  if (!match || !match[1] || !match[2]) {
    // If we can't parse the date, return the current date as fallback
    console.error(`Could not parse date string: ${dateString}`);
    return new Date();
  }

  const day = parseInt(match[1], 10);
  const monthName = match[2].toLowerCase();
  const month = spanishMonths[monthName] ?? -1; // Use -1 as invalid month indicator

  if (month === -1) {
    console.error(`Unknown month: ${monthName}`);
    return new Date();
  }

  // Get current date information
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Determine if the holiday should be in the next year
  // If the month is before the current month, it's likely next year's holiday
  const year = month < currentMonth ? currentYear + 1 : currentYear;

  // Create the date object
  return new Date(year, month, day);
}

export async function extractHolidaysFromURL(url: string): Promise<Holiday[]> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const holidays: Holiday[] = [];
    
    // Extract the next holiday (special structure)
    const nextHolidayDiv = html.match(/<div[^>]*class="[^"]*holidays__recent-holiday[^"]*"[^>]*>[\s\S]*?<\/div>/i);
    if (nextHolidayDiv) {
      const dateMatch = nextHolidayDiv[0].match(/<div[^>]*class="[^"]*holidays__recent-holiday-date[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const nameMatch = nextHolidayDiv[0].match(/<div[^>]*class="[^"]*holidays__recent-holiday-name[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      
      if (dateMatch && nameMatch) {
        const dateString = dateMatch[1].replace(/<[^>]*>/g, "").trim();
        const name = nameMatch[1].replace(/<[^>]*>/g, "").trim();
        
        if (dateString && name) {
          const parsedDate = parseSpanishDate(dateString);
          
          // Add the next holiday as the first item
          holidays.push({
            dateString,
            name,
            date: parsedDate,
          });
        }
      }
    }

    // Simple regex-based parsing as a fallback that works everywhere
    // Look for holiday list items
    const holidayItems = html.match(/<li[^>]*class="[^"]*holidays__list-item[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*holidays__list-item-name[^"]*"[^>]*>[\s\S]*?<\/span><\/li>/gi) || [];
    
    for (const item of holidayItems) {
      // Extract all date spans from the current holiday item
      const dateSpans = item.match(/<span[^>]*class="[^"]*holidays__list-item-date[^"]*"[^>]*>([\s\S]*?)<\/span>/gi) || [];
      let dateString = '';
      
      // Combine all date spans into a single string
      for (const span of dateSpans) {
        const content = span.replace(/<[^>]*>/g, "").trim();
        dateString += content + ' ';
      }
      // Remove trailing colon if present
      dateString = dateString.trim().replace(/:\s*$/, "");
      
      // Extract the name
      const nameMatch = item.match(/<span[^>]*class="[^"]*holidays__list-item-name[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const name = nameMatch ? nameMatch[1].replace(/<[^>]*>/g, "").trim() : "";
      
      if (dateString && name) {
        const parsedDate = parseSpanishDate(dateString);

        holidays.push({
          dateString,
          name,
          date: parsedDate,
        });
      }
    }

    return holidays;
  } catch (error) {
    console.error("Error extracting holidays:", error);
    return [];
  }
}
