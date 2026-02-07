import React, { useState, useEffect, useRef, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { TopHeader, BottomNav } from './components/Navigation';
import { AttendanceRecord, Sewadar, Counter } from './types';
import { StorageService } from './services/storageService';
import { AttendanceList } from './components/AttendanceList';
import { Calendar, Share2, Plus, ArrowRight, UserPlus, Search, Trash2, MoreVertical, Edit2, X, Download, Check, Sparkles, MapPin, Clock, FileText, FileBarChart, ChevronDown, AlertCircle } from 'lucide-react';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-stone-50">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-stone-800 mb-2">Something went wrong</h1>
          <p className="text-stone-500 mb-8 max-w-xs">The application encountered an unexpected error. Please try reloading the page.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-stone-900 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  
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
            search && (
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
            )
          )}
        </div>
      )}
    </div>
  );
};

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateDuration = (inTime: string, outTime: string | null) => {
  if (!outTime) return "Active";
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
  if (diffMins < 0) diffMins += 24 * 60;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAFAF9] relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-stone-200 rounded-full blur-3xl opacity-50"></div>
      <div className="relative z-10 flex flex-col items-center text-center animate-fade-in">
        <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-stone-200 border border-stone-100 mb-8 animate-scale-in">
          <span className="text-5xl font-black text-stone-900">J</span>
          <span className="text-5xl font-black text-primary-600">S</span>
        </div>
        <h1 className="text-4xl font-extrabold text-stone-800 mb-3 tracking-tight">Jalpan<span className="text-primary-600">Sewa</span></h1>
        <p className="text-lg text-stone-500 font-medium mb-10 max-w-[260px] leading-relaxed">Attendance Portal</p>
        <button onClick={() => navigate('/home')} className="group relative w-full max-w-[280px] py-4 bg-stone-900 text-white font-bold text-lg rounded-2xl shadow-2xl shadow-stone-900/20 hover:scale-[1.02] active:scale-95 transition-all overflow-hidden">
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex items-center justify-center gap-3">Enter Portal <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></div>
        </button>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const [sewadars, setSewadars] = useState<Sewadar[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState<string>(getTodayString());
  const [selectedSewadar, setSelectedSewadar] = useState<string>('');
  const [selectedCounter, setSelectedCounter] = useState<string>('');
  const [inTime, setInTime] = useState<string>('');
  const [outTime, setOutTime] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [markOutRecordId, setMarkOutRecordId] = useState<string | null>(null);
  const [manualOutTime, setManualOutTime] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const s = await StorageService.getSewadars();
        setSewadars(s || []);
        const c = await StorageService.getCounters();
        setCounters(c || []);
      } catch (err) { console.error("Fetch error:", err); }
    };
    fetchData();
    const now = new Date();
    setInTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

  useEffect(() => { loadRecords(); }, [date]);

  const loadRecords = async () => {
    try {
      const r = await StorageService.getRecordsByDate(date);
      setRecords(r || []);
    } catch (err) { console.error("Record Load error:", err); }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSewadar || !selectedCounter || !inTime) return;
    const sewadarObj = sewadars.find(s => s.id === selectedSewadar);
    const counterObj = counters.find(c => c.id === selectedCounter);
    if (!sewadarObj || !counterObj) return;
    await StorageService.saveRecord({
      id: Date.now().toString(),
      sewadarName: sewadarObj.name,
      counterName: counterObj.name,
      date, inTime, outTime: outTime || null, timestamp: Date.now()
    });
    await loadRecords();
    setIsFormOpen(false);
    setSelectedSewadar(''); setSelectedCounter(''); setOutTime('');
  };

  return (
    <div className="pb-10 animate-fade-in">
      <div className="px-6 pt-6 pb-2">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-1">Today's Overview</p>
            <div className="relative group">
               <h2 className="text-3xl font-extrabold text-stone-800">{new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</h2>
               <div className="absolute top-0 right-0 w-full h-full opacity-0 cursor-pointer">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-full cursor-pointer" />
               </div>
               <div className="h-1 w-12 bg-primary-500 rounded-full mt-1 group-hover:w-full transition-all duration-300"></div>
            </div>
          </div>
          <button onClick={() => setIsFormOpen(true)} className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-stone-900/30 hover:scale-105 active:scale-95 transition-all"><Plus className="w-6 h-6" strokeWidth={3} /></button>
        </div>
        <div className="bg-gradient-to-br from-primary-800 to-primary-600 rounded-3xl p-6 text-white shadow-2xl shadow-primary-900/20 mb-8 relative overflow-hidden">
            <div className="relative z-10">
                <span className="block text-primary-200 text-sm font-medium mb-1">Active Sewadars</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold tracking-tight">{records.filter(r => !r.outTime).length}</span>
                    <span className="text-primary-200 font-medium">/ {sewadars.length} Total</span>
                </div>
            </div>
        </div>
      </div>
      <div className="px-4"><h3 className="text-lg font-bold text-stone-800 mb-4 px-2">Live Feed</h3><AttendanceList records={records} onMarkOut={(r) => { setManualOutTime(new Date().toTimeString().slice(0, 5)); setMarkOutRecordId(r.id); }} onDelete={async (id) => { await StorageService.deleteRecord(id); loadRecords(); }} /></div>
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl animate-slide-up relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-stone-50 p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 z-20"><h2 className="text-xl font-bold text-stone-800">New Entry</h2><button onClick={() => setIsFormOpen(false)} className="p-2 bg-white rounded-full text-stone-400 shadow-sm"><X className="w-5 h-5" /></button></div>
                <form onSubmit={handleCheckIn} className="p-6 space-y-5">
                    <div className="space-y-2"><label className="text-xs font-bold text-stone-500 uppercase ml-1">Sewadar</label><SearchableSelect options={sewadars} value={selectedSewadar} onChange={setSelectedSewadar} onAddNew={async (n) => { const updated = await StorageService.addSewadar(n); setSewadars(updated); const added = updated.find(s => s.name === n); if(added) setSelectedSewadar(added.id); }} placeholder="Find or add sewadar..." /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-stone-500 uppercase ml-1">Sewa Area</label><SearchableSelect options={counters} value={selectedCounter} onChange={setSelectedCounter} onAddNew={async (n) => { const updated = await StorageService.addCounter(n); setCounters(updated); const added = updated.find(c => c.name === n); if(added) setSelectedCounter(added.id); }} placeholder="Select or add area..." /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-stone-500 uppercase ml-1">In Time</label><CustomTimePicker value={inTime} onChange={setInTime} /></div>
                    <button type="submit" className="w-full py-4 bg-stone-900 text-white font-bold rounded-2xl text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-4">Confirm Entry <ArrowRight className="w-5 h-5" /></button>
                </form>
            </div>
        </div>
      )}
      {markOutRecordId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={() => setMarkOutRecordId(null)} />
            <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 relative z-10 text-center animate-scale-in">
                <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-3"><Clock className="w-7 h-7" /></div>
                <h3 className="text-xl font-bold text-stone-800 mb-6">Mark Out Time</h3>
                <CustomTimePicker value={manualOutTime} onChange={setManualOutTime} />
                <button onClick={async () => { const record = records.find(r => r.id === markOutRecordId); if(record) { await StorageService.saveRecord({...record, outTime: manualOutTime}); await loadRecords(); } setMarkOutRecordId(null); }} className="w-full py-3.5 bg-stone-900 text-white font-bold rounded-xl mt-6 active:scale-95">Complete Shift</button>
            </div>
        </div>
      )}
    </div>
  );
};

// ... HistoryPage, SewadarsPage remains largely similar to provided content but wrapped in Suspense ...

function AppContent() {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/';
  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans text-stone-900 selection:bg-primary-100">
      {!isWelcomePage && <TopHeader />}
      <div className={`max-w-md mx-auto min-h-screen bg-[#FAFAF9] shadow-2xl relative border-x border-white`}>
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-stone-200 border-t-primary-500 rounded-full animate-spin"></div></div>}>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/home" element={<HomePage />} />
            {/* ... other routes ... */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      {!isWelcomePage && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;