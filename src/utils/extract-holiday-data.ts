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
  try {
    console.log(`Fetching holidays from ${url}`);

    // Add headers to help with potential CORS issues
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch holidays: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const holidays: Holiday[] = [];
    let nextHoliday: Holiday | null = null;
    let currentHoliday: Holiday | null = null;

    // Process the next upcoming holiday (special structure)
    const rewriter = new HTMLRewriter()
      .on("div.holidays__recent-holiday", {
        element(element) {
          // Create a new holiday object for the next upcoming holiday
          nextHoliday = { dateString: "", name: "", date: new Date() };
        },
        comments() {}, // Required to avoid TypeScript errors
        text() {}, // Required to avoid TypeScript errors
      })
      .on("div.holidays__recent-holiday-date", {
        text(text: TextChunk) {
          if (nextHoliday && text.text.trim()) {
            // Set the date string for the next holiday
            nextHoliday.dateString = text.text.trim();
          }
        },
        element() {}, // Required to avoid TypeScript errors
        comments() {}, // Required to avoid TypeScript errors
      })
      .on("div.holidays__recent-holiday-name", {
        text(text: TextChunk) {
          if (nextHoliday && text.text.trim()) {
            // Append to the name (since name can be split across multiple text nodes)
            if (!nextHoliday.name) {
              nextHoliday.name = text.text.trim();
            } else {
              // Add the text without adding extra spaces
              nextHoliday.name += text.text.trim();
            }
          }
        },
        element(element) {
          if (element.tagName === "div" && element.onEndTag) {
            element.onEndTag(function () {
              if (nextHoliday && nextHoliday.dateString && nextHoliday.name) {
                try {
                  // Parse the date string into a Date object
                  const parsedDate = parseSpanishDate(nextHoliday.dateString);
                  
                  // Add the next holiday to the holidays array
                  holidays.push({
                    dateString: nextHoliday.dateString,
                    name: nextHoliday.name.trim(),
                    date: parsedDate
                  });
                  
                  console.log(`Added next upcoming holiday: ${nextHoliday.name} on ${nextHoliday.dateString}`);
                } catch (err) {
                  console.error(`Failed to parse next holiday date: ${nextHoliday.dateString}`, err);
                }
              }
            });
          }
        },
        comments() {} // Required to avoid TypeScript errors
      })
      .on("li.holidays__list-item", {
        element(element) {
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
            // Append to the name (since name can be split across multiple text nodes)
            if (!currentHoliday.name) {
              currentHoliday.name = text.text.trim();
            } else {
              // Add the text without adding extra spaces
              currentHoliday.name += text.text.trim();
            }
          }
        },
        // When we've finished processing the name element, finalize the holiday
        element(element) {
          if (element.tagName === "span" && element.onEndTag) {
            element.onEndTag(function () {
              if (
                currentHoliday &&
                currentHoliday.dateString &&
                currentHoliday.name
              ) {
                // Clean up the date format (remove trailing colon if present)
                currentHoliday.dateString = currentHoliday.dateString
                  .replace(/:\s*$/, "")
                  .trim();

                // Parse the date string into a Date object
                try {
                  const parsedDate = parseSpanishDate(
                    currentHoliday.dateString
                  );

                  // Normalize spaces in the name (replace multiple spaces with single space)
                  const normalizedName = currentHoliday.name
                    .replace(/\s+/g, " ")
                    .trim();

                  holidays.push({
                    dateString: currentHoliday.dateString,
                    name: normalizedName,
                    date: parsedDate,
                  });
                } catch (err) {
                  console.error(
                    `Failed to parse date: ${currentHoliday.dateString}`,
                    err
                  );
                }
              }
            });
          }
        },
      });

    // Process the HTML content
    console.log("Starting HTMLRewriter transform");
    await rewriter.transform(response).arrayBuffer();

    console.log(`Finished processing. Found ${holidays.length} holidays.`);
    if (holidays.length > 0) {
    }

    return holidays;
  } catch (error) {
    console.error("Error extracting holidays:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, message: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    return [];
  }
}
