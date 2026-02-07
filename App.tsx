import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { TopHeader, BottomNav } from './components/Navigation';
import { AttendanceRecord, Sewadar, Counter } from './types';
import { StorageService } from './services/storageService';
import { AttendanceList } from './components/AttendanceList';
import { Calendar, Share2, Plus, ArrowRight, UserPlus, Search, Trash2, MoreVertical, Edit2, X, Download, Check, Sparkles, MapPin, Clock, FileText, FileBarChart, ChevronDown } from 'lucide-react';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// Helper to format time to 12-hour AM/PM
const formatTime12Hour = (time24: string | null) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

// --- Custom Time Picker Component ---
interface TimePickerProps {
  value: string; // HH:mm format (24h)
  onChange: (value: string) => void;
  required?: boolean;
}

const CustomTimePicker: React.FC<TimePickerProps> = ({ value, onChange, required }) => {
  // Parse initial 24h value to 12h parts
  const parseTime = (val: string) => {
    if (!val) return { h: '12', m: '00', p: 'AM' };
    const [hh, mm] = val.split(':');
    let hNum = parseInt(hh, 10);
    const p = hNum >= 12 ? 'PM' : 'AM';
    hNum = hNum % 12 || 12;
    return { 
      h: hNum.toString().padStart(2, '0'), 
      m: mm, 
      p 
    };
  };

  const [parts, setParts] = useState(parseTime(value));

  useEffect(() => {
    setParts(parseTime(value));
  }, [value]);

  const updateTime = (newH: string, newM: string, newP: string) => {
    let hNum = parseInt(newH, 10);
    if (newP === 'PM' && hNum !== 12) hNum += 12;
    if (newP === 'AM' && hNum === 12) hNum = 0;
    
    const time24 = `${hNum.toString().padStart(2, '0')}:${newM}`;
    onChange(time24);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')); // Every minute
  
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <select 
          value={parts.h}
          onChange={(e) => updateTime(e.target.value, parts.m, parts.p)}
          className="w-full appearance-none bg-stone-50 border border-stone-200 text-stone-900 text-center font-bold text-lg rounded-xl py-3 pr-6 focus:ring-2 focus:ring-primary-100 outline-none"
        >
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
      </div>
      
      <div className="flex items-center text-stone-400 font-bold">:</div>
      
      <div className="relative flex-1">
        <select 
          value={parts.m}
          onChange={(e) => updateTime(parts.h, e.target.value, parts.p)}
          className="w-full appearance-none bg-stone-50 border border-stone-200 text-stone-900 text-center font-bold text-lg rounded-xl py-3 pr-6 focus:ring-2 focus:ring-primary-100 outline-none"
        >
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
      </div>

      <div className="relative flex-1">
        <select 
          value={parts.p}
          onChange={(e) => updateTime(parts.h, parts.m, e.target.value)}
          className="w-full appearance-none bg-stone-100 border border-stone-200 text-primary-700 text-center font-bold text-lg rounded-xl py-3 pr-6 focus:ring-2 focus:ring-primary-100 outline-none"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
      </div>
    </div>
  );
};

// --- Improved Searchable Select with Add Option ---
const SearchableSelect: React.FC<{
  options: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  onAddNew: (name: string) => void;
  placeholder: string;
}> = ({ options, value, onChange, onAddNew, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = options.find(o => o.id === value);
    if (selected) setSearch(selected.name);
    else if (!value) setSearch('');
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        const selected = options.find(o => o.id === value);
        setSearch(selected ? selected.name : '');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options]);

  const filteredOptions = options.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={search}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (value) onChange('');
          }}
          placeholder={placeholder}
          className="w-full pl-4 pr-10 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-800 placeholder-stone-400 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm"
        />
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-stone-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-scale-in origin-top">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <div
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setSearch(option.name);
                  setIsOpen(false);
                }}
                className="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-stone-50 last:border-0 text-stone-700 font-medium flex items-center justify-between group"
              >
                {option.name}
                <ArrowRight className="w-4 h-4 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0" />
              </div>
            ))
          ) : (
            <div className="p-2">
                <button 
                    onClick={() => {
                        onAddNew(search);
                        setIsOpen(false);
                    }}
                    className="w-full p-3 text-left bg-primary-50 text-primary-700 font-bold rounded-xl hover:bg-primary-100 transition-colors flex items-center justify-between"
                >
                    <span>+ Add "{search}"</span>
                    <UserPlus className="w-4 h-4" />
                </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to get local date string in YYYY-MM-DD format
const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to calculate duration
const calculateDuration = (inTime: string, outTime: string | null) => {
  if (!outTime) return "Active";
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
  if (diffMins < 0) diffMins += 24 * 60; // Handle overnight
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// --- Welcome Page ---
const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAFAF9] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-stone-200 rounded-full blur-3xl opacity-50"></div>

      <div className="relative z-10 flex flex-col items-center text-center animate-fade-in">
        {/* Logo */}
        <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-stone-200 border border-stone-100 mb-8 animate-scale-in">
          <span className="text-5xl font-black text-stone-900">J</span>
          <span className="text-5xl font-black text-primary-600">S</span>
        </div>

        {/* Text */}
        <h1 className="text-4xl font-extrabold text-stone-800 mb-3 tracking-tight">
          Jalpan<span className="text-primary-600">Sewa</span>
        </h1>
        <p className="text-lg text-stone-500 font-medium mb-10 max-w-[260px] leading-relaxed">
          Attendance Portal
        </p>

        {/* Button */}
        <button 
          onClick={() => navigate('/home')}
          className="group relative w-full max-w-[280px] py-4 bg-stone-900 text-white font-bold text-lg rounded-2xl shadow-2xl shadow-stone-900/20 hover:scale-[1.02] active:scale-95 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex items-center justify-center gap-3">
            Enter Portal
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
};

// --- Home Page ---
const HomePage: React.FC = () => {
  const [sewadars, setSewadars] = useState<Sewadar[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  // Initialize with local date to ensure accuracy
  const [date, setDate] = useState<string>(getTodayString());
  
  // Form State
  const [selectedSewadar, setSelectedSewadar] = useState<string>('');
  const [selectedCounter, setSelectedCounter] = useState<string>('');
  const [inTime, setInTime] = useState<string>('');
  const [outTime, setOutTime] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Mark Out Modal State
  const [markOutRecordId, setMarkOutRecordId] = useState<string | null>(null);
  const [manualOutTime, setManualOutTime] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      const s = await StorageService.getSewadars();
      setSewadars(s);
      const c = await StorageService.getCounters();
      setCounters(c);
    };
    fetchData();
    const now = new Date();
    setInTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    loadRecords();
  }, [date]);

  const loadRecords = async () => {
    const r = await StorageService.getRecordsByDate(date);
    setRecords(r);
  };

  const handleAddNewSewadar = async (name: string) => {
    if (name.trim()) {
        const updatedList = await StorageService.addSewadar(name.trim());
        setSewadars(updatedList);
        const newSewadar = updatedList.find(s => s.name === name.trim());
        if(newSewadar) setSelectedSewadar(newSewadar.id);
    }
  };

  const handleAddNewCounter = async (name: string) => {
    if (name.trim()) {
        const updatedList = await StorageService.addCounter(name.trim());
        setCounters(updatedList);
        const newCounter = updatedList.find(c => c.name === name.trim());
        if(newCounter) setSelectedCounter(newCounter.id);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSewadar || !selectedCounter || !inTime) return;

    const sewadarObj = sewadars.find(s => s.id === selectedSewadar);
    const counterObj = counters.find(c => c.id === selectedCounter);
    if (!sewadarObj || !counterObj) return;

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      sewadarName: sewadarObj.name,
      counterName: counterObj.name,
      date: date,
      inTime: inTime,
      outTime: outTime || null, // Optional out time
      timestamp: Date.now()
    };

    await StorageService.saveRecord(newRecord);
    await loadRecords();
    setIsFormOpen(false);
    setSelectedSewadar('');
    setSelectedCounter('');
    setOutTime('');
  };

  const initiateMarkOut = (record: AttendanceRecord) => {
    const now = new Date();
    setManualOutTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setMarkOutRecordId(record.id);
  };

  const confirmMarkOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markOutRecordId || !manualOutTime) return;

    const record = records.find(r => r.id === markOutRecordId);
    if (record) {
      const updatedRecord = { ...record, outTime: manualOutTime };
      await StorageService.saveRecord(updatedRecord);
      await loadRecords();
    }
    setMarkOutRecordId(null);
    setManualOutTime('');
  };

  const handleDeleteRecord = async (id: string) => {
    await StorageService.deleteRecord(id);
    await loadRecords();
  };

  return (
    <div className="pb-10">
      {/* Date & Hero Section */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-1">Today's Overview</p>
            <div className="relative group">
               <h2 className="text-3xl font-extrabold text-stone-800">
                  {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
               </h2>
               <div className="absolute top-0 right-0 w-full h-full opacity-0 cursor-pointer">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-full cursor-pointer" />
               </div>
               <div className="h-1 w-12 bg-primary-500 rounded-full mt-1 group-hover:w-full transition-all duration-300"></div>
            </div>
          </div>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-stone-900/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-br from-primary-800 to-primary-600 rounded-3xl p-6 text-white shadow-2xl shadow-primary-900/20 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
                <Sparkles className="w-32 h-32" />
            </div>
            <div className="relative z-10">
                <span className="block text-primary-200 text-sm font-medium mb-1">Active Sewadars</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold tracking-tight">{records.filter(r => !r.outTime).length}</span>
                    <span className="text-primary-200 font-medium">/ {sewadars.length} Total Sewadars</span>
                </div>
            </div>
        </div>
      </div>

      {/* Attendance List Area */}
      <div className="px-4">
         <h3 className="text-lg font-bold text-stone-800 mb-4 px-2">Live Feed</h3>
         <AttendanceList records={records} onMarkOut={initiateMarkOut} onDelete={handleDeleteRecord} />
      </div>

      {/* Modern Slide-Up Form Modal (New Entry) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsFormOpen(false)} />
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl animate-slide-up relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-stone-50 p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 z-20">
                    <h2 className="text-xl font-bold text-stone-800">New Entry</h2>
                    <button onClick={() => setIsFormOpen(false)} className="p-2 bg-white rounded-full text-stone-400 hover:text-stone-800 shadow-sm"><X className="w-5 h-5" /></button>
                </div>
                
                <form onSubmit={handleCheckIn} className="p-6 space-y-5">
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Sewadar</label>
                        <SearchableSelect 
                            options={sewadars}
                            value={selectedSewadar}
                            onChange={setSelectedSewadar}
                            onAddNew={handleAddNewSewadar}
                            placeholder="Find or add sewadar..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Sewa Area</label>
                         <SearchableSelect 
                            options={counters}
                            value={selectedCounter}
                            onChange={setSelectedCounter}
                            onAddNew={handleAddNewCounter}
                            placeholder="Select or add area..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">In Time</label>
                        <CustomTimePicker value={inTime} onChange={setInTime} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-wider ml-1">Out Time <span className="text-[10px] normal-case opacity-70">(Optional)</span></label>
                         <CustomTimePicker value={outTime} onChange={setOutTime} />
                    </div>

                    <button 
                        type="submit" 
                        className="w-full py-4 bg-stone-900 text-white font-bold rounded-2xl text-lg shadow-xl shadow-stone-900/20 hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        Confirm Entry <ArrowRight className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Mark Out Modal */}
      {markOutRecordId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm transition-opacity" onClick={() => setMarkOutRecordId(null)} />
            <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl animate-scale-in relative z-10 overflow-hidden">
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Clock className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-stone-800">Mark Out Time</h3>
                        <p className="text-sm text-stone-400">Confirm the time this shift ended</p>
                    </div>
                    
                    <form onSubmit={confirmMarkOut} className="space-y-4">
                         <div className="relative">
                            <CustomTimePicker value={manualOutTime} onChange={setManualOutTime} />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full py-3.5 bg-stone-900 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all"
                        >
                            Complete Shift
                        </button>
                        <button 
                            type="button"
                            onClick={() => setMarkOutRecordId(null)}
                            className="w-full py-2 text-stone-400 font-bold text-sm hover:text-stone-600"
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// --- Detailed Report Component for PDF ---
const DetailedReportView: React.FC<{ 
    date: string; 
    records: AttendanceRecord[]; 
}> = ({ date, records }) => {
    // Group by counter
    const counterCounts = records.reduce((acc, r) => {
        acc[r.counterName] = (acc[r.counterName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="bg-white p-8 w-full max-w-4xl mx-auto text-sm font-sans" id="full-report-print">
            {/* Header */}
            <div className="mb-6">
                <p className="text-gray-500 italic text-xs mb-1">With the blessings of Almighty</p>
                <h1 className="text-3xl font-extrabold text-[#2F3C7E] mb-1">Jalpan Sewa Report</h1>
                <p className="text-gray-600 font-medium">Daily Duty Summary</p>
                <div className="h-0.5 w-full bg-gray-200 mt-4"></div>
            </div>

            {/* 1. Overview */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-[#2F3C7E] pl-2">1. Duty Overview</h2>
                <div className="border border-gray-300 rounded-sm overflow-hidden">
                    <table className="w-full">
                         <thead className="bg-[#2F3C7E] text-white">
                            <tr>
                                <th className="p-2 text-left w-1/3 font-semibold text-xs uppercase tracking-wider">Metric</th>
                                <th className="p-2 text-left font-semibold text-xs uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                             <tr>
                                <td className="p-2 bg-gray-50 font-medium text-gray-700">Reporting Date</td>
                                <td className="p-2 text-gray-900">{new Date(date).toLocaleDateString('en-GB', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</td>
                             </tr>
                             <tr>
                                <td className="p-2 bg-gray-50 font-medium text-gray-700">Total Sewadars</td>
                                <td className="p-2 text-gray-900 font-bold">{records.length}</td>
                             </tr>
                             <tr>
                                <td className="p-2 bg-gray-50 font-medium text-gray-700">Locations Covered</td>
                                <td className="p-2 text-gray-900 text-xs leading-relaxed">{Object.keys(counterCounts).join(', ')}</td>
                             </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Distribution */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-[#2F3C7E] pl-2">2. Service Point Deployment</h2>
                <div className="border border-gray-300 rounded-sm overflow-hidden">
                    <table className="w-full">
                         <thead className="bg-[#00b894] text-white"> 
                            <tr>
                                <th className="p-2 text-left font-semibold text-xs uppercase tracking-wider">Counter / Location</th>
                                <th className="p-2 text-right font-semibold text-xs uppercase tracking-wider">Number of Sewadars</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {Object.entries(counterCounts).map(([name, count]) => (
                                <tr key={name} className="even:bg-gray-50">
                                    <td className="p-2 text-gray-700">{name}</td>
                                    <td className="p-2 text-right font-bold text-gray-900">{count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

             {/* 3. Detailed Log */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-[#2F3C7E] pl-2">3. Detailed Attendance Log</h2>
                <div className="border border-gray-300 rounded-sm overflow-hidden">
                    <table className="w-full text-xs">
                         <thead className="bg-[#2F3C7E] text-white">
                            <tr>
                                <th className="p-2 text-left w-10">#</th>
                                <th className="p-2 text-left">Name</th>
                                <th className="p-2 text-center w-20">In</th>
                                <th className="p-2 text-center w-20">Out</th>
                                <th className="p-2 text-center w-16">Dur</th>
                                <th className="p-2 text-left">Location</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-gray-200">
                            {records.map((r, i) => (
                                <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="p-2 text-gray-500">{i + 1}</td>
                                    <td className="p-2 font-bold text-gray-800">{r.sewadarName}</td>
                                    <td className="p-2 text-center font-medium text-green-700 whitespace-nowrap">{formatTime12Hour(r.inTime)}</td>
                                    <td className="p-2 text-center text-gray-600 whitespace-nowrap">{formatTime12Hour(r.outTime) || '-'}</td>
                                    <td className="p-2 text-center text-gray-500">{calculateDuration(r.inTime, r.outTime)}</td>
                                    <td className="p-2 text-gray-700">{r.counterName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             {/* Footer */}
             <div className="text-center text-gray-400 text-[10px] mt-10 border-t border-gray-100 pt-4">
                Generated by JalpanSewa App | {new Date().toLocaleString()}
             </div>
        </div>
    );
}

// --- History Page ---
const HistoryPage: React.FC = () => {
  // Initialize with local date to ensure accuracy
  const [date, setDate] = useState<string>(getTodayString());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      const r = await StorageService.getRecordsByDate(date);
      setRecords(r);
    };
    fetchHistory();
  }, [date]);

  const generateReportText = () => {
    let text = `*Jalpan Sewa Report*\n`;
    const formattedDate = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    text += `Date: ${formattedDate}\n\n`;
    records.forEach((r, idx) => {
      text += `${idx + 1}. *${r.sewadarName}* (${r.counterName})\n`;
      text += `   🕒 ${formatTime12Hour(r.inTime)} - ${formatTime12Hour(r.outTime) || 'Present'}\n`;
    });
    return text;
  };

  const handleShare = async () => {
    const text = generateReportText();
    if (navigator.share) {
      try { await navigator.share({ title: `Jalpan Report ${date}`, text: text }); } 
      catch (err) { console.log('Share canceled'); }
    } else {
      navigator.clipboard.writeText(text);
      alert('Report copied to clipboard!');
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('full-report-print');
    if (element && typeof html2canvas === 'function') {
      try {
        // Use a higher scale for better clarity
        const canvas = await html2canvas(element, { 
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Initialize jsPDF
        // @ts-ignore
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // If content is taller than page, might need multi-page logic, 
        // but for now simple fit or scale is usually enough for daily reports.
        // For very long lists, a proper multi-page html2pdf solution is better, 
        // but simple image scaling works for 1-2 pages.
        
        if (imgHeight <= pdfHeight) {
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        } else {
             // Basic multi-page handling
             let heightLeft = imgHeight;
             let position = 0;
             
             pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
             heightLeft -= pdfHeight;
             
             while (heightLeft >= 0) {
               position = heightLeft - imgHeight;
               pdf.addPage();
               pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
               heightLeft -= pdfHeight;
             }
        }
        
        pdf.save(`Jalpan_Full_Report_${date}.pdf`);
        setShowPreview(false); // Close preview after download
      } catch (error) { 
        console.error("Error generating PDF:", error); 
        alert("Could not generate PDF. Please try again.");
      }
    }
  };

  return (
    <div className="pb-24 px-6 pt-6">
      <h2 className="text-2xl font-extrabold text-stone-800 mb-6">History</h2>
      
      {/* Date Selector */}
      <div className="bg-white p-6 rounded-3xl shadow-xl shadow-stone-200/40 border border-stone-100 mb-8 animate-fade-in">
        <h3 className="text-lg font-bold text-stone-800 mb-2 flex items-center gap-2">
           <FileText className="w-5 h-5 text-primary-600" />
           Past Attendance Report
        </h3>
        <p className="text-sm text-stone-400 mb-5 font-medium leading-relaxed">
            Select a date to view logs or generate reports.
        </p>
        
        <div className="relative">
            <label className="flex items-center justify-between bg-stone-50 px-5 py-4 rounded-2xl border border-stone-200 hover:border-primary-400 transition-colors cursor-pointer group">
                <span className="font-bold text-lg text-stone-800 group-hover:text-primary-700 transition-colors">
                    {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <div className="bg-white p-2 rounded-xl shadow-sm text-stone-500 group-hover:text-primary-600">
                    <Calendar className="w-5 h-5" />
                </div>
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </label>
        </div>
      </div>

      {records.length > 0 ? (
        <div className="space-y-6 animate-slide-up">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
             <button onClick={handleShare} className="flex flex-col items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 py-4 rounded-2xl font-bold transition-all active:scale-95">
                <Share2 className="w-6 h-6 text-stone-600" />
                <span className="text-xs">Share Summary</span>
             </button>
             <button onClick={() => setShowPreview(true)} className="flex flex-col items-center justify-center gap-2 bg-stone-900 text-white py-4 rounded-2xl font-bold shadow-lg shadow-stone-900/20 active:scale-95 transition-all">
                <FileBarChart className="w-6 h-6 text-primary-400" />
                <span className="text-xs">View Detailed Report</span>
             </button>
          </div>
          
          {/* Simple List View in History */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-100">
             <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4 pl-2">Log Preview</h3>
             {records.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between py-3 px-2 border-b border-stone-50 last:border-0">
                    <div>
                        <p className="font-bold text-stone-800 text-sm">{r.sewadarName}</p>
                        <p className="text-xs text-stone-400">{r.counterName}</p>
                    </div>
                    <div className="text-right">
                         <p className="font-bold text-stone-600 text-xs">{formatTime12Hour(r.inTime)} - {formatTime12Hour(r.outTime) || '...'}</p>
                    </div>
                </div>
             ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
           <div className="w-24 h-24 bg-stone-200 rounded-full mb-4"></div>
           <p className="font-bold text-stone-400">No History for this date</p>
        </div>
      )}
      
      {/* Full Report Preview Modal */}
      {showPreview && (
         <div className="fixed inset-0 z-[80] flex flex-col bg-stone-100">
            {/* Modal Header */}
            <div className="bg-white p-4 shadow-sm flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold text-stone-800">Report Preview</h3>
                <button onClick={() => setShowPreview(false)} className="p-2 bg-stone-100 rounded-full text-stone-600"><X className="w-5 h-5"/></button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="shadow-2xl max-w-4xl mx-auto">
                    <DetailedReportView date={date} records={records} />
                </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-stone-200 flex justify-center shrink-0">
                 <button 
                    onClick={handleDownloadPDF}
                    className="w-full max-w-md py-4 bg-stone-900 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-95 transition-all"
                 >
                    <Download className="w-5 h-5 text-primary-400" /> Save as PDF
                 </button>
            </div>
         </div>
      )}
    </div>
  );
};

// --- Sewadars Page ---
const SewadarsPage: React.FC = () => {
  const [sewadars, setSewadars] = useState<Sewadar[]>([]);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.menu-container') === null) setActiveMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadSewadars = async () => {
        const data = await StorageService.getSewadars();
        setSewadars(data);
    };
    loadSewadars();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      const updated = await StorageService.addSewadar(newName.trim());
      setSewadars(updated);
      setNewName('');
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (editName.trim()) {
        const updated = await StorageService.updateSewadar(id, editName.trim());
        setSewadars(updated);
        setEditingId(null);
        setActiveMenuId(null);
    }
  };

  const handleDelete = async (id: string) => {
      const updated = await StorageService.deleteSewadar(id);
      setSewadars(updated);
  };

  const filteredSewadars = sewadars.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="pb-24 px-6 pt-6">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-2xl font-extrabold text-stone-800">Team Members</h2>
         <span className="bg-primary-100 text-primary-700 font-bold px-3 py-1 rounded-full text-xs">{sewadars.length} Total</span>
      </div>
      
      <div className="mb-6 relative">
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-stone-100 rounded-2xl shadow-sm text-stone-800 font-medium focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-stone-400" />
      </div>

      <div className="mb-8">
        {!isAdding ? (
            <button 
                onClick={() => setIsAdding(true)}
                className="w-full py-4 bg-stone-900 rounded-2xl text-white font-bold shadow-lg shadow-stone-900/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
                <UserPlus className="w-5 h-5 text-primary-400" /> Add New Member
            </button>
        ) : (
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-stone-100 animate-fade-in">
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">New Sewadar Details</h3>
                <form onSubmit={handleAdd} className="flex flex-col gap-4">
                    <input 
                        type="text" 
                        value={newName}
                        autoFocus
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:border-primary-500 outline-none font-medium"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setIsAdding(false)} className="py-3 text-stone-500 font-bold bg-stone-100 rounded-xl">Cancel</button>
                        <button type="submit" className="py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-600/30">Save</button>
                    </div>
                </form>
            </div>
        )}
      </div>

      <div className="space-y-3">
          {filteredSewadars.length > 0 ? (
            filteredSewadars.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center justify-between group hover:border-primary-200 transition-colors">
                {editingId === s.id ? (
                    <div className="flex-1 flex gap-2 animate-fade-in">
                         <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 p-2 bg-stone-50 border border-primary-200 rounded-lg focus:outline-none" />
                        <button onClick={() => handleUpdate(s.id)} className="p-2 bg-primary-100 text-primary-700 rounded-lg"><Check className="w-5 h-5"/></button>
                        <button onClick={() => setEditingId(null)} className="p-2 bg-stone-100 text-stone-500 rounded-lg"><X className="w-5 h-5"/></button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-600 font-bold shadow-inner">
                                {s.name.charAt(0)}
                            </div>
                            <span className="font-bold text-stone-800 text-lg">{s.name}</span>
                        </div>
                        <div className="relative menu-container">
                            <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === s.id ? null : s.id); }} className="p-2 text-stone-300 hover:bg-stone-50 hover:text-stone-600 rounded-full transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                            {activeMenuId === s.id && (
                                <div className="absolute right-0 top-10 w-44 bg-white border border-stone-100 rounded-2xl shadow-xl z-20 overflow-hidden animate-scale-in origin-top-right">
                                    <button onClick={() => { setEditingId(s.id); setEditName(s.name); setActiveMenuId(null); }} className="w-full text-left px-5 py-3.5 text-sm font-bold text-stone-600 hover:bg-stone-50 flex items-center gap-3">
                                        <Edit2 className="w-4 h-4" /> Edit Name
                                    </button>
                                    <button onClick={() => handleDelete(s.id)} className="w-full text-left px-5 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3">
                                        <Trash2 className="w-4 h-4" /> Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-stone-400">No members found.</div>
          )}
        </div>
    </div>
  );
};

function AppContent() {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans text-stone-900 selection:bg-primary-100">
      {!isWelcomePage && <TopHeader />}
      <div className={`max-w-md mx-auto min-h-screen bg-[#FAFAF9] shadow-2xl shadow-stone-200/50 relative border-x border-white`}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/sewadars" element={<SewadarsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isWelcomePage && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;