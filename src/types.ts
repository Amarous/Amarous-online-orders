export interface ProductItem {
  name: string;
  price: number;
  unitPrice?: number;
  quantity?: number;
  thumbnail?: string;
  imageBox?: number[];
  isAvailable?: boolean;
}

export interface UserActivity {
  id: string;
  userId: string;
  username: string;
  action: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  isPaid: boolean;
  paymentMethod: 'Cash' | 'Visa' | 'InstaPay';
  isContacted: boolean;
  notes: string;
  pdfFiles: { name: string; dataUrl: string; mimeType: string }[];
  thumbnail?: string;
  paymentConfirmationImage?: string;
  total: number;
  shippingCost: number;
  discount?: number;
  discountType?: 'amount' | 'percentage';
  paidAmount: number;
  productDetails: ProductItem[];
  createdAt: string;
  type: 'website' | 'social';
  isReady?: boolean;
}

export type UserRole = 'admin' | 'manager' | 'stock_keeper';

export interface User {
  id: string;
  username: string;
  plainPassword?: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
}
