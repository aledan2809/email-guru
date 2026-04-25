import type { ScheduledJob } from '@/types/email';

// Default scheduled jobs
export const DEFAULT_JOBS: ScheduledJob[] = [
  {
    id: 'job-classify-inbox',
    type: 'classify',
    schedule: '*/15 * * * *', // Every 15 minutes
    enabled: true,
    nextRun: getNextRun('*/15 * * * *'),
  },
  {
    id: 'job-invoice-extract',
    type: 'invoice-extract',
    schedule: '0 * * * *', // Every hour
    enabled: true,
    nextRun: getNextRun('0 * * * *'),
  },
  {
    id: 'job-cleanup',
    type: 'cleanup',
    schedule: '0 0 * * 0', // Weekly on Sunday at midnight
    enabled: false,
    nextRun: getNextRun('0 0 * * 0'),
  },
];

// Simple cron parser for next run calculation
function getNextRun(cronExpression: string): string {
  // Simplified implementation - in production use a proper cron library
  const now = new Date();
  const parts = cronExpression.split(' ');

  if (parts.length !== 5) {
    return new Date(now.getTime() + 60000).toISOString();
  }

  const [minute, hour] = parts;

  // Handle every X minutes pattern
  if (minute.startsWith('*/')) {
    const interval = parseInt(minute.slice(2));
    const currentMinute = now.getMinutes();
    const nextMinute = Math.ceil(currentMinute / interval) * interval;

    if (nextMinute >= 60) {
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
    } else {
      now.setMinutes(nextMinute);
    }
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now.toISOString();
  }

  // Handle specific minute pattern
  if (minute !== '*' && hour === '*') {
    const targetMinute = parseInt(minute);
    if (now.getMinutes() >= targetMinute) {
      now.setHours(now.getHours() + 1);
    }
    now.setMinutes(targetMinute);
    now.setSeconds(0);
    now.setMilliseconds(0);
    return now.toISOString();
  }

  // Default: next minute
  return new Date(now.getTime() + 60000).toISOString();
}

// Job runner state
let jobsState: ScheduledJob[] = [...DEFAULT_JOBS];
let runningJobs: Map<string, boolean> = new Map();

export function getJobs(): ScheduledJob[] {
  return jobsState;
}

export function updateJob(id: string, updates: Partial<ScheduledJob>): ScheduledJob | null {
  const index = jobsState.findIndex(j => j.id === id);
  if (index === -1) return null;

  jobsState[index] = {
    ...jobsState[index],
    ...updates,
  };

  return jobsState[index];
}

export function toggleJob(id: string): ScheduledJob | null {
  const job = jobsState.find(j => j.id === id);
  if (!job) return null;

  return updateJob(id, { enabled: !job.enabled });
}

export async function runJob(jobId: string, runClassify: () => Promise<void>): Promise<{ success: boolean; message: string }> {
  const job = jobsState.find(j => j.id === jobId);
  if (!job) {
    return { success: false, message: 'Job not found' };
  }

  if (runningJobs.get(jobId)) {
    return { success: false, message: 'Job already running' };
  }

  runningJobs.set(jobId, true);

  try {
    switch (job.type) {
      case 'classify':
        await runClassify();
        break;
      case 'invoice-extract':
        // Will be implemented with invoice extraction
        console.log('Invoice extraction job not yet implemented');
        break;
      case 'cleanup':
        console.log('Cleanup job not yet implemented');
        break;
    }

    // Update job state
    updateJob(jobId, {
      lastRun: new Date().toISOString(),
      nextRun: getNextRun(job.schedule),
    });

    return { success: true, message: `Job ${job.type} completed successfully` };
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    return { success: false, message: `Job failed: ${error}` };
  } finally {
    runningJobs.set(jobId, false);
  }
}

export function isJobRunning(jobId: string): boolean {
  return runningJobs.get(jobId) || false;
}

// Format schedule for display
export function formatSchedule(cronExpression: string): string {
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) return cronExpression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Every X minutes
  if (minute.startsWith('*/')) {
    const interval = minute.slice(2);
    return `Every ${interval} minutes`;
  }

  // Every hour
  if (minute !== '*' && hour === '*') {
    return `Every hour at :${minute.padStart(2, '0')}`;
  }

  // Specific time
  if (minute !== '*' && hour !== '*') {
    if (dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${days[parseInt(dayOfWeek)]} at ${hour}:${minute.padStart(2, '0')}`;
    }
    if (dayOfMonth !== '*') {
      return `Day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`;
    }
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }

  return cronExpression;
}
