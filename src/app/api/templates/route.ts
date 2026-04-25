import { NextRequest, NextResponse } from 'next/server';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/lib/email-templates';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const category = searchParams.get('category');

  if (id) {
    const template = getTemplateById(id);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: { template },
    });
  }

  let templates = getTemplates();

  if (category) {
    templates = templates.filter(t => t.category === category);
  }

  return NextResponse.json({
    success: true,
    data: { templates },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, subject, body: templateBody, category } = body;

    if (!name || !subject || !templateBody || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, subject, body, category' },
        { status: 400 }
      );
    }

    const template = createTemplate({
      name,
      subject,
      body: templateBody,
      category,
    });

    return NextResponse.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID required' },
        { status: 400 }
      );
    }

    const template = updateTemplate(id, updates);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
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
        { error: 'Template ID required' },
        { status: 400 }
      );
    }

    const success = deleteTemplate(id);
    if (!success) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
