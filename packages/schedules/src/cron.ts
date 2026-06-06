/**
 * Client-side cron expression validation.
 * Validates standard 5-field cron expressions without server round-trip.
 */
export function validateCronLocal(expression: string): {
  valid: boolean;
  error?: string;
  description?: string;
} {
  if (!expression || typeof expression !== "string") {
    return { valid: false, error: "Expression is required" };
  }

  const trimmed = expression.trim();
  const fields = trimmed.split(/\s+/);

  if (fields.length !== 5) {
    return {
      valid: false,
      error: `Expected 5 fields, got ${fields.length}`,
    };
  }

  const ranges: [number, number][] = [
    [0, 59], // minute
    [0, 23], // hour
    [1, 31], // day of month
    [1, 12], // month
    [0, 7], // day of week (0=Sunday)
  ];

  const fieldNames = ["minute", "hour", "day of month", "month", "day of week"];

  for (let i = 0; i < 5; i++) {
    const field = fields[i];
    const [min, max] = ranges[i];

    if (!isValidCronField(field, min, max)) {
      return {
        valid: false,
        error: `Invalid ${fieldNames[i]} field: "${field}" (expected 0-${max} or *)`,
      };
    }
  }

  return { valid: true, description: describeCron(trimmed) };
}

function isValidCronField(field: string, min: number, max: number): boolean {
  if (field === "*") return true;

  // Handle step values: */5, 1-30/5
  const parts = field.split("/");
  if (parts.length === 2) {
    const step = Number.parseInt(parts[1], 10);
    if (Number.isNaN(step) || step < 1) return false;
    return isValidCronField(parts[0], min, max);
  }

  // Handle ranges: 1-5
  const rangeParts = field.split("-");
  if (rangeParts.length === 2) {
    const start = Number.parseInt(rangeParts[0], 10);
    const end = Number.parseInt(rangeParts[1], 10);
    return (
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      start >= min &&
      end <= max &&
      start <= end
    );
  }

  // Handle lists: 1,3,5
  const listParts = field.split(",");
  if (listParts.length > 1) {
    return listParts.every((p) => isValidCronField(p, min, max));
  }

  const num = Number.parseInt(field, 10);
  return !Number.isNaN(num) && num >= min && num <= max;
}

function describeCron(expression: string): string {
  const fields = expression.split(/\s+/);
  const [minute, hour, dom, , dow] = fields;

  if (minute === "*" && hour === "*" && dom === "*" && dow === "*") {
    return "Every minute";
  }
  if (hour === "*" && dom === "*" && dow === "*") {
    return `Every ${minute} minute(s) past each hour`;
  }
  if (dom === "*" && dow === "*") {
    return `At ${minute} minute(s) past hour ${hour}`;
  }
  if (dow !== "*") {
    return `At ${minute} minute(s) past hour ${hour} on day(s) of week ${dow}`;
  }
  return `Cron: ${expression}`;
}

/**
 * Computes next run times from a cron expression locally.
 * Falls back to manual computation for simple patterns.
 */
export function nextCronRunsLocal(
  expression: string,
  count: number = 5,
  from: Date = new Date()
): Date[] {
  const validation = validateCronLocal(expression);
  if (!validation.valid) return [];

  const fields = expression.trim().split(/\s+/);
  const results: Date[] = [];
  const now = new Date(from.getTime() + 60_000); // Start from next minute
  now.setSeconds(0, 0);

  const minuteField = fields[0];
  const hourField = fields[1];

  let minute = now.getMinutes();
  let hour = now.getHours();
  let day = now.getDate();
  let month = now.getMonth();
  let year = now.getFullYear();

  for (let i = 0; i < count * 1440 && results.length < count; i++) {
    minute++;
    if (minute > 59) {
      minute = 0;
      hour++;
    }
    if (hour > 23) {
      hour = 0;
      day++;
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    if (day > daysInMonth) {
      day = 1;
      month++;
    }
    if (month > 11) {
      month = 0;
      year++;
    }

    if (
      matchesCronField(minuteField, minute, 0, 59) &&
      matchesCronField(hourField, hour, 0, 23)
    ) {
      results.push(new Date(year, month, day, hour, minute));
    }
  }

  return results;
}

function matchesCronField(
  field: string,
  value: number,
  _min: number,
  _max: number
): boolean {
  if (field === "*") return true;

  // Step values: */5
  const parts = field.split("/");
  if (parts.length === 2) {
    const range = parts[0] === "*" ? `${_min}` : parts[0];
    const step = Number.parseInt(parts[1], 10);
    const [rangeStart] = range.split("-").map(Number);
    return (value - (rangeStart ?? _min)) % step === 0;
  }

  // Ranges: 1-5
  const rangeParts = field.split("-");
  if (rangeParts.length === 2) {
    const start = Number.parseInt(rangeParts[0], 10);
    const end = Number.parseInt(rangeParts[1], 10);
    return value >= start && value <= end;
  }

  // Lists: 1,3,5
  const listParts = field.split(",");
  if (listParts.length > 1) {
    return listParts.some((p) => matchesCronField(p, value, _min, _max));
  }

  // Exact value
  return Number.parseInt(field, 10) === value;
}
