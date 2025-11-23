
import { LiveDB } from './supabaseService';
import { MockDB } from './mockDatabase';
import { IS_LIVE_MODE } from './config';
import { Resident, ActivityLog, WhatsAppGroup } from '../types';

export interface BotStatusResponse {
    status: 'connected' | 'disconnected' | 'offline';
    hasQR?: boolean;
}

interface DatabaseInterface {
  getResidents: () => Promise<Resident[]>;
  addResident: (resident: Omit<Resident, 'id'>) => Promise<Resident>;
  deleteResident: (id: string) => Promise<void>; // Added delete method
  getLogs: () => Promise<ActivityLog[]>;
  createLog: (logData: Omit<ActivityLog, 'id' | 'timestamp' | 'status'>) => Promise<ActivityLog>;
  getWhatsAppGroups: () => Promise<WhatsAppGroup[]>;
  
  // Bot Specific
  checkBotStatus: () => Promise<BotStatusResponse>;
  getBotQR: () => Promise<string | null>;
}

export const DB: DatabaseInterface = IS_LIVE_MODE ? LiveDB : MockDB;
