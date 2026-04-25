import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL_ERROR';

export type ApiMeta = {
  requestId: string;
  timestamp: string;
};

type ApiErrorPayload = {
  success: false;
  meta: ApiMeta;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: string[];
  };
};

type ApiSuccessPayload<T> = {
  success: true;
  meta: ApiMeta;
  data: T;
};

export function createApiMeta(requestId = crypto.randomUUID()): ApiMeta {
  return {
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function jsonSuccess<T>(data: T, status = 200, meta = createApiMeta()) {
  const payload: ApiSuccessPayload<T> = {
    success: true,
    meta,
    data,
  };
  return NextResponse.json(payload, { status });
}

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  meta: ApiMeta,
  details?: string[],
) {
  const payload: ApiErrorPayload = {
    success: false,
    meta,
    error: {
      code,
      message,
      details,
    },
  };

  return NextResponse.json(payload, { status });
}

export function validateJsonContentType(request: Request, meta: ApiMeta) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonError(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'Content-Type must be application/json.',
      meta,
    );
  }

  return null;
}

export async function parseJsonBody(request: Request, meta: ApiMeta) {
  try {
    return {
      ok: true as const,
      data: (await request.json()) as unknown,
    };
  } catch {
    return {
      ok: false as const,
      response: jsonError(400, 'INVALID_JSON', 'Request body must be valid JSON.', meta),
    };
  }
}
