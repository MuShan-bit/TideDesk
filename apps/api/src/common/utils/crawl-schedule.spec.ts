import { CrawlScheduleKind } from '@prisma/client';
import {
  assertValidScheduleConfig,
  buildIntervalScheduleConfig,
  estimateIntervalMinutesFromCron,
  getNextRunAtForSchedule,
  getNextRunAtFromCron,
} from './crawl-schedule';

describe('crawl-schedule', () => {
  it('calculates the next run for interval schedules', () => {
    const nextRunAt = getNextRunAtForSchedule(
      buildIntervalScheduleConfig(45),
      new Date('2026-03-20T10:15:00.000Z'),
    );

    expect(nextRunAt.toISOString()).toBe('2026-03-20T11:00:00.000Z');
  });

  it('calculates the next run for daily cron schedules', () => {
    const nextRunAt = getNextRunAtFromCron(
      '30 9 * * *',
      new Date('2026-03-20T09:45:00.000Z'),
    );

    expect(nextRunAt.toISOString()).toBe('2026-03-21T01:30:00.000Z');
  });

  it('calculates the next run for weekly cron schedules', () => {
    const nextRunAt = getNextRunAtFromCron(
      '15 8 * * 1,4',
      new Date('2026-03-20T09:45:00.000Z'),
    );

    expect(nextRunAt.toISOString()).toBe('2026-03-23T00:15:00.000Z');
  });

  it('estimates a fallback interval from cron schedules', () => {
    expect(estimateIntervalMinutesFromCron('0 * * * *')).toBe(60);
    expect(estimateIntervalMinutesFromCron('30 9 * * *')).toBe(1440);
  });

  it('rejects invalid cron schedules', () => {
    expect(() =>
      assertValidScheduleConfig({
        scheduleKind: CrawlScheduleKind.CRON,
        scheduleCron: 'invalid cron',
        intervalMinutes: 60,
      }),
    ).toThrow('Cron expressions must contain exactly 5 fields');
  });
});
