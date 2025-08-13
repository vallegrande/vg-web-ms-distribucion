
export enum Role {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT',
  SUPERADMIN = 'SUPERADMIN'
}

export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

/* Model - Payment */
export interface Payment {
  paymentId: string;
  organizationId: string;
  paymentCode: string;
  userId: string;
  waterBoxId: string;
  paymentType: string;
  paymentMethod: string;
  totalAmount: number;
  paymentDate: Date;
  paymentStatus: string;
  status: Status;
  externalReference: string;
}

/* Response - PaymentResponse (coincide con backend) */
export interface PaymentResponse {
  paymentId: string;
  organizationId: string;
  paymentCode: string;
  userId: string;
  waterBoxId: string;
  paymentType: string;
  paymentMethod: string;
  totalAmount: number;
  paymentDate: Date;
  paymentStatus: string;
  externalReference: string;
  createdAt: Date;
  updatedAt: Date;
  details: PaymentDetail[];
}

/* Model - PaymentDetail */
export interface PaymentDetail {
  paymentDetailId: string;
  paymentId: string;
  concept: string;
  year: number;
  month: number;
  amount: number;
  description: string;
  periodStart: Date;
  periodEnd: Date;
}

/* Request - PaymentCreate */
export interface PaymentCreate {
  organizationId: string;
  paymentCode: string;
  userId: string;
  waterBoxId: string;
  paymentType: string;
  paymentMethod: string;
  totalAmount: number;
  paymentDate: Date;
  paymentStatus: string;
  externalReference: string;
  details: PaymentDRequest[];
}

/* Request - PaymentDRequest (coincide con backend) */
export interface PaymentDRequest {
  concept: string;
  year: number;
  month: number;
  amount: number;
  description: string;
  periodStart: Date;
  periodEnd: Date;
}

/* Legacy - DetailPayments (mantener para compatibilidad) */
export interface DetailPayments {
  paymentDetailId: string;
  paymentId: string;
  concept: string;
  year: string;
  month: string;
  amount: string;
  description: string;
  periodStart: Date;
  periodEnd: Date;
}

/* Model - Receipts */
export interface Receipts {
  receiptsId: string;
  organizationId: string;
  paymentId: string;
  paymentDetailId: string;
  receiptSeries: string;
  receiptNumber: string;
  receiptType: string;
  issueDate: Date;
  amount: number;
  year: string;
  month: string;
  concept: string;
  customerFullName: string;
  customerDocument: string;
  pdfGenerated: string;
  pdfPath: string;
}

export interface PaymentUpdate {
  organizationId?: string;
  paymentCode?: string;
  userId?: string;
  waterBoxId?: string;
  paymentType?: string;
  paymentMethod?: string;
  totalAmount?: number;
  paymentDate?: Date;
  paymentStatus?: string;
  externalReference?: string;
}

