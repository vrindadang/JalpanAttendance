import { AttendanceRecord, Sewadar, Counter } from '../types';
import { supabase } from './supabaseClient';

export const StorageService = {
  getRecordsByDate: async (date: string): Promise<AttendanceRecord[]> => {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', date)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => ({
        id: item.id,
        sewadarName: item.sewadar_name,
        counterName: item.counter_name,
        date: item.date,
        inTime: item.in_time,
        outTime: item.out_time,
        timestamp: item.timestamp,
      }));
    } catch (error) {
      console.error('Error fetching records:', error);
      return [];
    }
  },

  saveRecord: async (record: AttendanceRecord) => {
    try {
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

      if (error) throw error;
    } catch (error) {
      console.error('Error saving record:', error);
    }
  },

  deleteRecord: async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  },

  getSewadars: async (): Promise<Sewadar[]> => {
    try {
      const { data, error } = await supabase
        .from('sewadars')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sewadars:', error);
      return [];
    }
  },

  addSewadar: async (name: string): Promise<Sewadar[]> => {
    try {
      const newId = Date.now().toString();
      const { error } = await supabase
        .from('sewadars')
        .insert([{ id: newId, name }]);

      if (error) throw error;
      return StorageService.getSewadars();
    } catch (error) {
      console.error('Error adding sewadar:', error);
      return StorageService.getSewadars();
    }
  },

  updateSewadar: async (id: string, name: string): Promise<Sewadar[]> => {
    try {
      const { data: oldData } = await supabase.from('sewadars').select('name').eq('id', id).single();
      if (oldData) {
        await supabase.from('sewadars').update({ name }).eq('id', id);
        await supabase.from('attendance_records').update({ sewadar_name: name }).eq('sewadar_name', oldData.name);
      }
      return StorageService.getSewadars();
    } catch (error) {
      console.error('Error updating sewadar:', error);
      return StorageService.getSewadars();
    }
  },

  deleteSewadar: async (id: string): Promise<Sewadar[]> => {
    try {
      const { data: oldData } = await supabase.from('sewadars').select('name').eq('id', id).single();
      if (oldData) {
         await supabase.from('sewadars').delete().eq('id', id);
         await supabase.from('attendance_records').delete().eq('sewadar_name', oldData.name);
      }
      return StorageService.getSewadars();
    } catch (error) {
      console.error('Error deleting sewadar:', error);
      return StorageService.getSewadars();
    }
  },

  getCounters: async (): Promise<Counter[]> => {
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .order('id');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching counters:', error);
      return [];
    }
  },

  addCounter: async (name: string): Promise<Counter[]> => {
    try {
      const newId = Date.now().toString();
      const { error } = await supabase
        .from('counters')
        .insert([{ id: newId, name }]);
      if (error) throw error;
      return StorageService.getCounters();
    } catch (error) {
      console.error('Error adding counter:', error);
      return StorageService.getCounters();
    }
  },
};