export interface SessionUser {
  id: string;
  phone: string;
  name: string;
  role: "ADMIN" | "USER";
  mustChangePassword: boolean;
  meters: {
    id: string;
    meterNumber: string;
    address: string | null;
  }[];
}

export interface PaymentWithRelations {
  id: string;
  userId: string;
  meterId: string;
  quantity: number;
  totalAmount: number;
  proofUrl: string | null;
  cloudStoragePath: string | null;
  referenceNumber: string | null;
  paymentDate: Date | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  user: {
    name: string;
    phone: string;
  };
  meter: {
    meterNumber: string;
  };
  tokens: {
    id: string;
    tokenValue: string;
    status: string;
  }[];
}

export const TOKEN_PRICE = 1600; // R1600 per token
