import { Hono } from "hono";
import { cors } from "hono/cors";
import { extractHolidaysFromURL } from "./utils/extract-holiday-data";
import { formatDate } from "./utils/format-date";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  return c.text(
    `peruvian-holiday-api by @cristianbgp\n\nGET /holidays (Query Parameter: public-sector: boolean)\nGET /is-it-holiday (Query Parameter: public-sector: boolean)`
  );
});

app.get("/holidays", async (c) => {
  const includePublicSectorHolidays: boolean =
    c.req.query("public-sector") === "true" || false;
  const holidays = await extractHolidaysFromURL("https://www.gob.pe/feriados");
  if (!includePublicSectorHolidays) {
    const filteredHolidays = holidays.filter(
      (holiday) => !holiday.name.includes("sector público")
    );
    c.header(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=60"
    );
    return c.json(filteredHolidays);
  }
  c.header("Cache-Control", "public, s-maxage=120, stale-while-revalidate=60");
  return c.json(holidays);
});

app.get("/is-it-holiday", async (c) => {
  const includePublicSectorHolidays: boolean =
    c.req.query("public-sector") === "true" || false;
  const today = new Date();
  const formattedDate = formatDate(today);
  const holidays = await extractHolidaysFromURL("https://www.gob.pe/feriados");
  if (!includePublicSectorHolidays) {
    const filteredHolidays = holidays.filter(
      (holiday) => !holiday.name.includes("sector público")
    );
    return c.json({ isHoliday: filteredHolidays.some((holiday) => {
      const holidayDate = holiday.date;
      const formattedHolidayDate = formatDate(holidayDate);
      return formattedHolidayDate === formattedDate;
    }) });
  }
  return c.json({ isHoliday: holidays.some((holiday) => {
    const holidayDate = holiday.date;
    const formattedHolidayDate = formatDate(holidayDate);
    return formattedHolidayDate === formattedDate;
  }) });
});

export default app;
