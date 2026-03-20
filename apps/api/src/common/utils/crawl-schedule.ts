import { CrawlScheduleKind } from '@prisma/client';

type ParsedField = {
  matches(value: number): boolean;
  restricted: boolean;
};

type ParsedCronExpression = {
  dayOfMonth: ParsedField;
  dayOfWeek: ParsedField;
  hour: ParsedField;
  minute: ParsedField;
  month: ParsedField;
};

const CRON_FIELD_COUNT = 5;
const MAX_LOOKAHEAD_MINUTES = 366 * 24 * 60;

export type CrawlScheduleConfig = {
  intervalMinutes: number;
  scheduleCron: string | null;
  scheduleKind: CrawlScheduleKind;
};

export function buildIntervalScheduleConfig(
  intervalMinutes: number,
): CrawlScheduleConfig {
  return {
    scheduleKind: CrawlScheduleKind.INTERVAL,
    scheduleCron: null,
    intervalMinutes,
  };
}

export function assertValidScheduleConfig(config: CrawlScheduleConfig) {
  if (config.scheduleKind === CrawlScheduleKind.INTERVAL) {
    if (!Number.isInteger(config.intervalMinutes)) {
      throw new Error('Interval schedules require an integer intervalMinutes');
    }

    if (config.intervalMinutes < 5) {
      throw new Error('Interval schedules require at least 5 minutes');
    }

    return;
  }

  if (!config.scheduleCron?.trim()) {
    throw new Error('Cron schedules require a scheduleCron expression');
  }

  parseCronExpression(config.scheduleCron);
}

export function getNextRunAtForSchedule(
  config: CrawlScheduleConfig,
  from = new Date(),
) {
  assertValidScheduleConfig(config);

  if (config.scheduleKind === CrawlScheduleKind.INTERVAL) {
    return new Date(from.getTime() + config.intervalMinutes * 60 * 1000);
  }

  return getNextRunAtFromCron(config.scheduleCron!, from);
}

export function getNextRunAtFromCron(expression: string, from = new Date()) {
  const parsed = parseCronExpression(expression);
  const candidate = new Date(from);

  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  for (let offset = 0; offset < MAX_LOOKAHEAD_MINUTES; offset += 1) {
    if (matchesCronExpression(parsed, candidate)) {
      return new Date(candidate);
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  throw new Error(
    `Unable to resolve the next run time for cron expression: ${expression}`,
  );
}

export function estimateIntervalMinutesFromCron(expression: string) {
  const first = getNextRunAtFromCron(expression, new Date('2026-01-01T00:00:00Z'));
  const second = getNextRunAtFromCron(
    expression,
    new Date(first.getTime() + 60 * 1000),
  );

  return Math.max(
    1,
    Math.round((second.getTime() - first.getTime()) / (60 * 1000)),
  );
}

function parseCronExpression(expression: string): ParsedCronExpression {
  const normalizedExpression = expression.trim().replace(/\s+/g, ' ');
  const fields = normalizedExpression.split(' ');

  if (fields.length !== CRON_FIELD_COUNT) {
    throw new Error('Cron expressions must contain exactly 5 fields');
  }

  return {
    minute: parseField(fields[0], 0, 59, 'minute'),
    hour: parseField(fields[1], 0, 23, 'hour'),
    dayOfMonth: parseField(fields[2], 1, 31, 'day of month'),
    month: parseField(fields[3], 1, 12, 'month'),
    dayOfWeek: parseField(fields[4], 0, 7, 'day of week', {
      normalize: (value) => (value === 7 ? 0 : value),
    }),
  };
}

function parseField(
  input: string,
  min: number,
  max: number,
  label: string,
  options?: {
    normalize?: (value: number) => number;
  },
): ParsedField {
  const values = new Set<number>();
  const parts = input.split(',');

  for (const rawPart of parts) {
    const part = rawPart.trim();

    if (!part) {
      throw new Error(`Invalid ${label} field: "${input}"`);
    }

    const [rangePart, stepPart] = part.split('/');
    const step = stepPart ? Number(stepPart) : 1;

    if (!Number.isInteger(step) || step <= 0) {
      throw new Error(`Invalid ${label} step value: "${part}"`);
    }

    const addValue = (value: number) => {
      const normalized = options?.normalize ? options.normalize(value) : value;

      if (normalized < min || normalized > max) {
        throw new Error(`Invalid ${label} value: "${value}"`);
      }

      values.add(normalized);
    };

    if (rangePart === '*') {
      for (let value = min; value <= max; value += step) {
        addValue(value);
      }

      continue;
    }

    const rangeMatch = rangePart.match(/^(\d+)-(\d+)$/);

    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);

      if (start > end) {
        throw new Error(`Invalid ${label} range: "${part}"`);
      }

      for (let value = start; value <= end; value += step) {
        addValue(value);
      }

      continue;
    }

    const scalar = Number(rangePart);

    if (!Number.isInteger(scalar)) {
      throw new Error(`Invalid ${label} value: "${part}"`);
    }

    if (stepPart) {
      for (let value = scalar; value <= max; value += step) {
        addValue(value);
      }

      continue;
    }

    addValue(scalar);
  }

  return {
    matches(value: number) {
      return values.has(value);
    },
    restricted: values.size !== max - min + 1,
  };
}

function matchesCronExpression(parsed: ParsedCronExpression, date: Date) {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();

  if (!parsed.minute.matches(minute) || !parsed.hour.matches(hour)) {
    return false;
  }

  if (!parsed.month.matches(month)) {
    return false;
  }

  const dayOfMonthMatches = parsed.dayOfMonth.matches(dayOfMonth);
  const dayOfWeekMatches = parsed.dayOfWeek.matches(dayOfWeek);

  if (!parsed.dayOfMonth.restricted && !parsed.dayOfWeek.restricted) {
    return true;
  }

  if (!parsed.dayOfMonth.restricted) {
    return dayOfWeekMatches;
  }

  if (!parsed.dayOfWeek.restricted) {
    return dayOfMonthMatches;
  }

  return dayOfMonthMatches || dayOfWeekMatches;
}
