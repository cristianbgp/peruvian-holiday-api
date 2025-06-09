interface Holiday {
  dateString: string;
  date: Date;
  name: string;
}

interface TextChunk {
  text: string;
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
  const response = await fetch(url);
  const holidays: Holiday[] = [];
  let currentHoliday: Holiday | null = null;

  const rewriter = new HTMLRewriter()
    .on("li.holidays__list-item", {
      element() {
        // Create a new holiday object when we encounter a list item
        // Initialize with empty strings and current date as placeholder
        currentHoliday = { dateString: "", name: "", date: new Date() };
      },
      comments() {}, // Required to avoid TypeScript errors
      text() {}, // Required to avoid TypeScript errors
    })
    .on("span.holidays__list-item-date", {
      text(text: TextChunk) {
        if (currentHoliday && text.text.trim()) {
          // Append to the date (since date can be split across multiple spans)
          currentHoliday.dateString += text.text.trim() + " ";
        }
      },
      element() {}, // Required to avoid TypeScript errors
      comments() {}, // Required to avoid TypeScript errors
    })
    .on("span.holidays__list-item-name", {
      text(text: TextChunk) {
        if (currentHoliday && text.text.trim()) {
          // Set the name for the current holiday
          currentHoliday.name = text.text.trim();

          // Add the completed holiday to our list
          if (currentHoliday.dateString && currentHoliday.name) {
            // Clean up the date format (remove trailing colon if present)
            currentHoliday.dateString = currentHoliday.dateString
              .replace(/:\s*$/, "")
              .trim();

            // Parse the date string into a Date object
            const parsedDate = parseSpanishDate(currentHoliday.dateString);

            holidays.push({
              ...currentHoliday,
              date: parsedDate,
            });
          }
        }
      },
      element() {}, // Required to avoid TypeScript errors
      comments() {}, // Required to avoid TypeScript errors
    });

  // Process the HTML content
  await rewriter.transform(response).arrayBuffer();

  return holidays;
}
