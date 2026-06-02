export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  iat?: number;
  exp?: number;
}

export interface MpesaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

export interface MikroTikSession {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  loginBy: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
}

export interface RadiusAccountingRecord {
  username: string;
  nasIpAddress: string;
  framedIpAddress?: string;
  callingStationId?: string;
  sessionId: string;
  sessionTime: number;
  inputOctets: number;
  outputOctets: number;
  terminateCause?: string;
}

export type KenyaCounty =
  | "Nairobi"
  | "Mombasa"
  | "Kisumu"
  | "Nakuru"
  | "Eldoret"
  | "Thika"
  | "Malindi"
  | "Kitale"
  | "Garissa"
  | "Kakamega";
