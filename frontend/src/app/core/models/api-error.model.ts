export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  path?: string;
  timestamp?: string;
}

export function getApiMessages(value: unknown): string[] {
  if (!isRecord(value) || !('message' in value)) {
    return [];
  }

  const message = value['message'];
  if (typeof message === 'string') {
    return [message];
  }

  return Array.isArray(message)
    ? message.filter((item): item is string => typeof item === 'string')
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
