export type Role = 'customer' | 'agent';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Product {
  id: string;
  name: string;
  tagline: string | null;
  description: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  category: string | null;
  createdAt: string;
}

export interface MessagePreview {
  id: string;
  content: string;
  senderRole: Role;
  createdAt: string;
}

export interface Conversation {
  id: string;
  productId: string;
  customerId: string;
  createdAt: string;
  lastMessageAt: string;
  product: Product;
  customer: { id: string; name: string; email: string };
  lastMessage: MessagePreview | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: Role;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  name: string;
  role: Role;
  isTyping: boolean;
}
