export interface ApiErrorPayload {
  code: string;
  details?: string[];
  message: string;
  path?: string;
  statusCode: number;
  timestamp: string;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}
