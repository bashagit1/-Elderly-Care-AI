export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  GUEST = 'GUEST'
}

export enum UpdateCategory {
  BREAKFAST = 'Breakfast',
  LUNCH = 'Lunch',
  DINNER = 'Dinner',
  VITALS = 'Vital Signs',
  GLUCOSE = 'Glucose',
  GENERAL = 'General Update'
}

export interface Resident {
  id: string;
  name: string;
  roomNumber: string;
  whatsappGroupId: string;
  notes?: string;
  photoUrl?: string;
}

export interface ActivityLog {
  id: string;
  residentId: string;
  residentName: string;
  staffName: string;
  category: UpdateCategory;
  timestamp: string; // ISO string
  notes: string;
  imageUrls: string[];
  status: 'PENDING' | 'SENT' | 'FAILED';
  aiGeneratedMessage?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: UserRole;
}

export interface WhatsAppGroup {
  id: string;
  name: string;
}