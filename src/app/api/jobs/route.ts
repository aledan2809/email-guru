import { NextRequest, NextResponse } from 'next/server';
import { getJobs, updateJob, toggleJob, runJob, formatSchedule } from '@/lib/scheduled-jobs';

export async function GET() {
  const jobs = getJobs();

  return NextResponse.json({
    success: true,
    data: {
      jobs: jobs.map(job => ({
        ...job,
        scheduleFormatted: formatSchedule(job.schedule),
      })),
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }

    const updatedJob = updateJob(id, updates);
    if (!updatedJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { job: updatedJob },
    });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id } = body;

    if (action === 'toggle') {
      const job = toggleJob(id);
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: { job },
      });
    }

    if (action === 'run') {
      // Placeholder for running the job - in production this would trigger actual email classification
      const result = await runJob(id, async () => {
        console.log('Running classification job...');
        // This would be called from the dashboard with actual classify function
      });

      return NextResponse.json({
        success: result.success,
        message: result.message,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error with job action:', error);
    return NextResponse.json(
      { error: 'Failed to process job action' },
      { status: 500 }
    );
  }
}
