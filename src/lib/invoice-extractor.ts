import { aiRouter } from './ai-router';
import type { Email, InvoiceData } from '@/types/email';

export async function extractInvoiceData(email: Email): Promise<InvoiceData | null> {
  // Check if this email is likely to contain invoice data
  if (!email.classification || email.classification.category !== 'invoice') {
    return null;
  }

  const prompt = `Extract invoice information from this email. Look for:
- Vendor/Company name
- Invoice amount (number only)
- Currency (USD, EUR, RON, etc.)
- Invoice number
- Invoice date
- Due date

Email:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.bodyText || email.snippet}

Respond with JSON only (or null if no invoice data found):
{
  "vendor": "Company Name",
  "amount": 123.45,
  "currency": "USD",
  "invoiceNumber": "INV-001",
  "invoiceDate": "2026-01-15",
  "dueDate": "2026-02-15",
  "confidence": 0.0-1.0
}`;

  try {
    const response = await aiRouter.chat({
      messages: [{ role: 'user', content: prompt }],
      provider: 'auto',
      maxTokens: 500,
      taskHint: 'extraction',
    });

    const text = response.content;

    if (text.toLowerCase().includes('null')) {
      return null;
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        emailId: email.id,
        vendor: parsed.vendor || 'Unknown',
        amount: typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount) || 0,
        currency: parsed.currency || 'USD',
        invoiceNumber: parsed.invoiceNumber,
        invoiceDate: parsed.invoiceDate,
        dueDate: parsed.dueDate,
        confidence: parsed.confidence || 0.7,
        extractedAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('Invoice extraction error:', error);
    return null;
  }
}

export async function batchExtractInvoices(emails: Email[]): Promise<InvoiceData[]> {
  const invoiceEmails = emails.filter(
    e => e.classification?.category === 'invoice'
  );

  const results: InvoiceData[] = [];

  for (const email of invoiceEmails) {
    const invoiceData = await extractInvoiceData(email);
    if (invoiceData) {
      results.push(invoiceData);
    }
  }

  return results;
}

// Storage for extracted invoices (in production, use database)
let extractedInvoices: InvoiceData[] = [];

export function saveInvoice(invoice: InvoiceData): void {
  const index = extractedInvoices.findIndex(i => i.emailId === invoice.emailId);
  if (index >= 0) {
    extractedInvoices[index] = invoice;
  } else {
    extractedInvoices.push(invoice);
  }
}

export function getInvoices(): InvoiceData[] {
  return extractedInvoices;
}

export function getInvoiceByEmailId(emailId: string): InvoiceData | null {
  return extractedInvoices.find(i => i.emailId === emailId) || null;
}

export function deleteInvoice(emailId: string): boolean {
  const index = extractedInvoices.findIndex(i => i.emailId === emailId);
  if (index >= 0) {
    extractedInvoices.splice(index, 1);
    return true;
  }
  return false;
}

// Format currency amount for display
export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    RON: 'lei',
    GBP: '£',
  };

  const symbol = symbols[currency] || currency;

  if (currency === 'RON') {
    return `${amount.toFixed(2)} ${symbol}`;
  }

  return `${symbol}${amount.toFixed(2)}`;
}
