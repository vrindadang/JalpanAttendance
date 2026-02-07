import { AttendanceRecord, Sewadar, Counter } from '../types';
import { supabase } from './supabaseClient';

export const StorageService = {
  getRecordsByDate: async (date: string): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', date)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching records:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      sewadarName: item.sewadar_name,
      counterName: item.counter_name,
      date: item.date,
      inTime: item.in_time,
      outTime: item.out_time,
      timestamp: item.timestamp,
    }));
  },

  saveRecord: async (record: AttendanceRecord) => {
    // Check if updating or inserting based on existence, but since we usually know, we can use upsert or plain insert
    // Map to DB column names
    const dbRecord = {
      id: record.id,
      sewadar_name: record.sewadarName,
      counter_name: record.counterName,
      date: record.date,
      in_time: record.inTime,
      out_time: record.outTime,
      timestamp: record.timestamp
    };

    const { error } = await supabase
      .from('attendance_records')
      .upsert(dbRecord);

    if (error) console.error('Error saving record:', error);
  },

  deleteRecord: async (id: string) => {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting record:', error);
  },

  getSewadars: async (): Promise<Sewadar[]> => {
    const { data, error } = await supabase
      .from('sewadars')
      .select('*')
      .order('name');

    if (error) {
        console.error('Error fetching sewadars:', error);
        return [];
    }
    return data;
  },

  addSewadar: async (name: string): Promise<Sewadar[]> => {
    const newId = Date.now().toString();
    const { error } = await supabase
      .from('sewadars')
      .insert([{ id: newId, name }]);

    if (error) console.error('Error adding sewadar:', error);
    return StorageService.getSewadars();
  },

  updateSewadar: async (id: string, name: string): Promise<Sewadar[]> => {
    // 1. Get old name
    const { data: oldData } = await supabase.from('sewadars').select('name').eq('id', id).single();
    
    if (oldData) {
        // 2. Update Sewadar Table
        await supabase.from('sewadars').update({ name }).eq('id', id);
        // 3. Update Attendance History
        await supabase.from('attendance_records').update({ sewadar_name: name }).eq('sewadar_name', oldData.name);
    }

    return StorageService.getSewadars();
  },

  deleteSewadar: async (id: string): Promise<Sewadar[]> => {
    const { data: oldData } = await supabase.from('sewadars').select('name').eq('id', id).single();
    
    if (oldData) {
         // 1. Delete from sewadars
         await supabase.from('sewadars').delete().eq('id', id);
         // 2. Delete history associated with this sewadar
         await supabase.from('attendance_records').delete().eq('sewadar_name', oldData.name);
    }
    return StorageService.getSewadars();
  },

  getCounters: async (): Promise<Counter[]> => {
    const { data, error } = await supabase
      .from('counters')
      .select('*')
      .order('id'); // Order by ID or some specific order if added

    if (error) {
        console.error('Error fetching counters:', error);
        return [];
    }
    return data;
  },

  addCounter: async (name: string): Promise<Counter[]> => {
    const newId = Date.now().toString();
    const { error } = await supabase
      .from('counters')
      .insert([{ id: newId, name }]);

    if (error) console.error('Error adding counter:', error);
    return StorageService.getCounters();
  },
};