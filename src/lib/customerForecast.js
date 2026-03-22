import { differenceInDays, parseISO, addDays } from "date-fns";

/**
 * Computes personal forecast for a customer based on their document history.
 * Returns: { lastDate, daysSinceLast, avgDaysBetween, nextPurchase, daysOverdue, daysRemaining, hasEnoughData }
 */
export function computePersonalForecast(docs) {
  if (!docs.length) {
    return { lastDate: null, daysSinceLast: null, avgDaysBetween: null, nextPurchase: null, daysOverdue: null, daysRemaining: null, hasEnoughData: false };
  }

  const sorted = [...docs].sort((a, b) => (b.document_date || "").localeCompare(a.document_date || ""));
  const lastDate = sorted[0].document_date || null;
  const daysSinceLast = lastDate ? differenceInDays(new Date(), parseISO(lastDate)) : null;

  if (sorted.length < 3) {
    return { lastDate, daysSinceLast, avgDaysBetween: null, nextPurchase: null, daysOverdue: null, daysRemaining: null, hasEnoughData: false };
  }

  const gaps = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].document_date && sorted[i + 1].document_date) {
      gaps.push(differenceInDays(parseISO(sorted[i].document_date), parseISO(sorted[i + 1].document_date)));
    }
  }

  if (!gaps.length) {
    return { lastDate, daysSinceLast, avgDaysBetween: null, nextPurchase: null, daysOverdue: null, daysRemaining: null, hasEnoughData: false };
  }

  const avgDaysBetween = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
  const nextPurchase = lastDate ? addDays(parseISO(lastDate), avgDaysBetween) : null;

  const today = new Date();
  let daysOverdue = null;
  let daysRemaining = null;

  if (nextPurchase) {
    const diff = differenceInDays(today, nextPurchase);
    if (diff > 0) {
      daysOverdue = diff;
    } else {
      daysRemaining = Math.abs(diff);
    }
  }

  return { lastDate, daysSinceLast, avgDaysBetween, nextPurchase, daysOverdue, daysRemaining, hasEnoughData: true };
}

/**
 * Returns forecast status: "on_time" | "late_minor" | "late_major" | "no_data"
 */
export function getForecastStatus(forecast) {
  if (!forecast.hasEnoughData) return "no_data";
  if (forecast.daysOverdue === null) return "on_time";
  if (forecast.daysOverdue <= 14) return "late_minor";
  return "late_major";
}