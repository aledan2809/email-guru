import { NextRequest, NextResponse } from 'next/server';
import type { ClassificationRule } from '@/types/email';
import { DEFAULT_RULES } from '@/lib/classification-rules';

// In-memory storage for server-side rules (in production, use database)
let serverRules: ClassificationRule[] = [...DEFAULT_RULES];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: { rules: serverRules },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rule } = body;

    if (!rule || !rule.name || !rule.conditions || !rule.action) {
      return NextResponse.json(
        { error: 'Invalid rule data' },
        { status: 400 }
      );
    }

    const newRule: ClassificationRule = {
      id: `rule-${Date.now()}`,
      name: rule.name,
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? 5,
      conditions: rule.conditions,
      action: rule.action,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    serverRules.push(newRule);

    return NextResponse.json({
      success: true,
      data: { rule: newRule },
    });
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    const index = serverRules.findIndex(r => r.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    serverRules[index] = {
      ...serverRules[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: { rule: serverRules[index] },
    });
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Rule ID required' },
        { status: 400 }
      );
    }

    const index = serverRules.findIndex(r => r.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    serverRules.splice(index, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}
