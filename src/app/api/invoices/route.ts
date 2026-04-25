import { NextRequest, NextResponse } from 'next/server';
import { extractInvoiceData, getInvoices, saveInvoice, deleteInvoice } from '@/lib/invoice-extractor';
import type { Email } from '@/types/email';

export async function GET() {
  const invoices = getInvoices();

  return NextResponse.json({
    success: true,
    data: { invoices },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as { email: Email };

    if (!email || !email.id) {
      return NextResponse.json(
        { error: 'Email data required' },
        { status: 400 }
      );
    }

    const invoiceData = await extractInvoiceData(email);

    if (!invoiceData) {
      return NextResponse.json({
        success: true,
        data: { invoice: null, message: 'No invoice data found in email' },
      });
    }

    saveInvoice(invoiceData);

    return NextResponse.json({
      success: true,
      data: { invoice: invoiceData },
    });
  } catch (error) {
    console.error('Invoice extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');

    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID required' },
        { status: 400 }
      );
    }

    const success = deleteInvoice(emailId);

    if (!success) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
