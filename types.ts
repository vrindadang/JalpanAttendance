export interface Sewadar {
  id: string;
  name: string;
}

export interface Counter {
  id: string;
  name: string;
}

export interface AttendanceRecord {
  id: string;
  sewadarName: string;
  counterName: string;
  date: string; // YYYY-MM-DD
  inTime: string; // HH:mm (24h format stored internally)
  outTime: string | null; // HH:mm
  notes?: string;
  timestamp: number;
}

export interface DailyReport {
  date: string;
  records: AttendanceRecord[];
}