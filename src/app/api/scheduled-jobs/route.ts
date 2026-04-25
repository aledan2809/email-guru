import { NextResponse } from 'next/server';
import { getJobs, toggleJob, formatSchedule } from '@/lib/scheduled-jobs';

export async function GET() {
  const jobs = getJobs();
  return NextResponse.json({
    data: jobs.map((j) => ({
      ...j,
      scheduleLabel: formatSchedule(j.schedule),
    })),
  });
}

export async function POST(request: Request) {
  try {
    const { action, jobId } = await request.json();

    if (action === 'toggle' && jobId) {
      const job = toggleJob(jobId);
      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ data: job });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Scheduled jobs error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
