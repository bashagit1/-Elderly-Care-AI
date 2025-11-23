
import { Resident, ActivityLog, WhatsAppGroup } from '../types';
import { BotStatusResponse } from './database';

// Initial Mock Data
const INITIAL_RESIDENTS: Resident[] = [
  { id: '1', name: 'Alice Johnson', roomNumber: '101', whatsappGroupId: '120363045@g.us', photoUrl: 'https://picsum.photos/200/200?random=1' },
  { id: '2', name: 'Robert Smith', roomNumber: '102', whatsappGroupId: '120363046@g.us', photoUrl: 'https://picsum.photos/200/200?random=2' },
  { id: '3', name: 'Eleanor Rigby', roomNumber: '205', whatsappGroupId: '120363047@g.us', photoUrl: 'https://picsum.photos/200/200?random=3' },
];

const STORAGE_KEY_RESIDENTS = 'ecw_residents';
const STORAGE_KEY_LOGS = 'ecw_logs';

export const MockDB = {
  getResidents: (): Promise<Resident[]> => {
    return new Promise((resolve) => {
      const stored = localStorage.getItem(STORAGE_KEY_RESIDENTS);
      if (stored) {
        resolve(JSON.parse(stored));
      } else {
        localStorage.setItem(STORAGE_KEY_RESIDENTS, JSON.stringify(INITIAL_RESIDENTS));
        resolve(INITIAL_RESIDENTS);
      }
    });
  },

  addResident: (resident: Omit<Resident, 'id'>): Promise<Resident> => {
    return new Promise((resolve) => {
      const newResident = { ...resident, id: Math.random().toString(36).substr(2, 9) };
      const stored = localStorage.getItem(STORAGE_KEY_RESIDENTS);
      const currentList = stored ? JSON.parse(stored) : INITIAL_RESIDENTS;
      const newList = [...currentList, newResident];
      localStorage.setItem(STORAGE_KEY_RESIDENTS, JSON.stringify(newList));
      setTimeout(() => resolve(newResident), 500); // Simulate network delay
    });
  },

  deleteResident: (id: string): Promise<void> => {
    return new Promise((resolve) => {
      const stored = localStorage.getItem(STORAGE_KEY_RESIDENTS);
      const currentList = stored ? JSON.parse(stored) : INITIAL_RESIDENTS;
      const newList = currentList.filter((r: Resident) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_RESIDENTS, JSON.stringify(newList));
      setTimeout(() => resolve(), 500);
    });
  },

  getLogs: (): Promise<ActivityLog[]> => {
    return new Promise((resolve) => {
      const stored = localStorage.getItem(STORAGE_KEY_LOGS);
      resolve(stored ? JSON.parse(stored) : []);
    });
  },

  createLog: (logData: Omit<ActivityLog, 'id' | 'timestamp' | 'status'>): Promise<ActivityLog> => {
    return new Promise((resolve) => {
      const newLog: ActivityLog = {
        ...logData,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        status: 'SENT', // In a real app, this might be 'PENDING' until the cloud function picks it up
      };
      
      const stored = localStorage.getItem(STORAGE_KEY_LOGS);
      const currentLogs = stored ? JSON.parse(stored) : [];
      // Add to beginning
      const newLogs = [newLog, ...currentLogs];
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(newLogs));
      
      setTimeout(() => resolve(newLog), 1500); // Simulate AI processing and WhatsApp sending time
    });
  },

  getWhatsAppGroups: (): Promise<WhatsAppGroup[]> => {
    return new Promise((resolve) => {
      // Simulate API delay and fetching groups from the bot
      setTimeout(() => {
        resolve([
          { id: '120363045@g.us', name: 'Alice Johnson Family' },
          { id: '120363046@g.us', name: 'Robert Smith Updates' },
          { id: '120363047@g.us', name: 'Eleanor Rigby Care Circle' },
          { id: '120363158@g.us', name: 'Sunrise Home Announcements' },
          { id: '120363159@g.us', name: 'Staff Coordination' },
        ]);
      }, 1000);
    });
  },

  checkBotStatus: (): Promise<BotStatusResponse> => {
    return Promise.resolve({ status: 'connected', hasQR: false });
  },

  getBotQR: (): Promise<string | null> => {
    return Promise.resolve(null);
  }
};
