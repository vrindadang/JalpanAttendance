
import React, { useState, useEffect, useRef, Suspense, Component, PropsWithChildren } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { TopHeader, BottomNav } from './components/Navigation';
import { AttendanceRecord, Sewadar, Counter } from './types';
import { StorageService } from './services/storageService';
import { AttendanceList } from './components/AttendanceList';
import { GeminiService } from './services/geminiService';
import { Calendar, Share2, Plus, ArrowRight, UserPlus, Search, Trash2, Clock, X, ChevronDown, AlertCircle } from 'lucide-react';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  // children is included via PropsWithChildren or explicitly defined
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Explicitly using Component from react to resolve props accessibility issues in some TS environments
class ErrorBoundary extends Component<PropsWithChildren<ErrorBoundaryProps>, ErrorBoundaryState> {
  constructor(props: PropsWithChildren<ErrorBoundaryProps>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: any): ErrorBoundaryState {
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
    
    // Fixed: Standard access to this.props.children in a class component
    return this.props.children;
  }
}

// --- Shared Utils ---
const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatTime12Hour = (time24: string | null) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

// --- Custom Components ---
const CustomTimePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const parseTime = (val: string) => {
    if (!val) return { h: '12', m: '00', p: 'AM' };
    const [hh, mm] = val.split(':');
    let hNum = parseInt(hh, 10);
    const p = hNum >= 12 ? 'PM' : 'AM';
    hNum = hNum % 12 || 12;
    return { h: hNum.toString().padStart(2, '0'), m: mm, p };
  };

  const [parts, setParts] = useState(parseTime(value));
  useEffect(() => setParts(parseTime(value)), [value]);

  const updateTime = (newH: string, newM: string, newP: string) => {
    let hNum = parseInt(newH, 10);
    if (newP === 'PM' && hNum !== 12) hNum += 12;
    if (newP === 'AM' && hNum === 12) hNum = 0;
    onChange(`${hNum.toString().padStart(2, '0')}:${newM}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <select value={parts.h} onChange={(e) => updateTime(e.target.value, parts.m, parts.p)} className="w-full appearance-none bg-stone-50 border border-stone-200 text-stone-900 text-center font-bold text-lg rounded-xl py-3 outline-none">
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
      </div>
      <div className="relative flex-1">
        <select value={parts.m} onChange={(e) => updateTime(parts.h, e.target.value, parts.p)} className="w-full appearance-none bg-stone-50 border border-stone-200 text-stone-900 text-center font-bold text-lg rounded-xl py-3 outline-none">
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
      </div>
      <div className="relative flex-1">
        <select value={parts.p} onChange={(e) => updateTime(parts.h, parts.m, e.target.value)} className="w-full appearance-none bg-stone-100 border border-stone-200 text-primary-700 text-center font-bold text-lg rounded-xl py-3 outline-none">
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
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={search}
        onClick={() => setIsOpen(true)}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); if (value) onChange(''); }}
        placeholder={placeholder}
        className="w-full pl-4 pr-10 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-stone-800 placeholder-stone-400 font-medium focus:ring-2 focus:ring-primary-500/20 outline-none"
      />
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-stone-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-scale-in">
          {filteredOptions.map(option => (
            <div key={option.id} onClick={() => { onChange(option.id); setSearch(option.name); setIsOpen(false); }} className="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-stone-50 last:border-0 text-stone-700 font-medium">
              {option.name}
            </div>
          ))}
          {search && !filteredOptions.some(o => o.name.toLowerCase() === search.toLowerCase()) && (
            <button onClick={() => { onAddNew(search); setIsOpen(false); }} className="w-full p-4 text-left bg-primary-50 text-primary-700 font-bold flex items-center justify-between">
              + Add "{search}" <UserPlus className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// --- Pages ---
const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAFAF9] text-center">
      <div className="w-28 h-28 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl border border-stone-100 mb-8">
        <span className="text-5xl font-black text-stone-900">J</span><span className="text-5xl font-black text-primary-600">S</span>
      </div>
      <h1 className="text-4xl font-extrabold text-stone-800 mb-3 tracking-tight">Jalpan<span className="text-primary-600">Sewa</span></h1>
      <p className="text-lg text-stone-500 font-medium mb-10">Attendance Portal</p>
      <button onClick={() => navigate('/home')} className="w-full max-w-[280px] py-4 bg-stone-900 text-white font-bold text-lg rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
        Enter Portal <ArrowRight className="w-5 h-5" />
      </button>
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [markOutRecordId, setMarkOutRecordId] = useState<string | null>(null);
  const [manualOutTime, setManualOutTime] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setSewadars(await StorageService.getSewadars());
      setCounters(await StorageService.getCounters());
    };
    fetchData();
    const now = new Date();
    setInTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

  useEffect(() => { loadRecords(); }, [date]);

  const loadRecords = async () => {
    const r = await StorageService.getRecordsByDate(date);
    setRecords(r || []);
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = sewadars.find(x => x.id === selectedSewadar);
    const c = counters.find(x => x.id === selectedCounter);
    if (!s || !c) return;
    await StorageService.saveRecord({
      id: Date.now().toString(),
      sewadarName: s.name,
      counterName: c.name,
      date, inTime, outTime: null, timestamp: Date.now()
    });
    await loadRecords();
    setIsFormOpen(false);
    setSelectedSewadar(''); setSelectedCounter('');
  };

  return (
    <div className="pb-10 animate-fade-in px-6 pt-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-1">Today</p>
          <div className="relative">
            <h2 className="text-3xl font-extrabold text-stone-800">{new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</h2>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center text-white shadow-xl active:scale-95 transition-all"><Plus className="w-6 h-6" /></button>
      </div>

      <div className="bg-primary-600 rounded-3xl p-6 text-white mb-8">
        <span className="block text-primary-100 text-sm mb-1">Active Now</span>
        <span className="text-5xl font-black">{records.filter(r => !r.outTime).length}</span>
      </div>

      <AttendanceList 
        records={records} 
        onMarkOut={(r) => { setManualOutTime(new Date().toTimeString().slice(0, 5)); setMarkOutRecordId(r.id); }} 
        onDelete={async (id) => { await StorageService.deleteRecord(id); loadRecords(); }} 
      />

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-6 animate-slide-up">
            <h2 className="text-xl font-bold mb-6">Check In</h2>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <SearchableSelect options={sewadars} value={selectedSewadar} onChange={setSelectedSewadar} onAddNew={async (n) => { const updated = await StorageService.addSewadar(n); setSewadars(updated); }} placeholder="Sewadar Name..." />
              <SearchableSelect options={counters} value={selectedCounter} onChange={setSelectedCounter} onAddNew={async (n) => { const updated = await StorageService.addCounter(n); setCounters(updated); }} placeholder="Sewa Counter..." />
              <CustomTimePicker value={inTime} onChange={setInTime} />
              <button type="submit" className="w-full py-4 bg-stone-900 text-white font-bold rounded-2xl">Confirm Check-In</button>
            </form>
          </div>
        </div>
      )}

      {markOutRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setMarkOutRecordId(null)} />
          <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 relative z-10 text-center animate-scale-in">
            <h3 className="text-xl font-bold mb-4">Mark Out</h3>
            <CustomTimePicker value={manualOutTime} onChange={setManualOutTime} />
            <button onClick={async () => { const r = records.find(x => x.id === markOutRecordId); if(r) { await StorageService.saveRecord({...r, outTime: manualOutTime}); await loadRecords(); } setMarkOutRecordId(null); }} className="w-full py-3 bg-stone-900 text-white font-bold rounded-xl mt-6">Finish Duty</button>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryPage: React.FC = () => {
  const [date, setDate] = useState(getTodayString());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    const fetch = async () => setRecords(await StorageService.getRecordsByDate(date));
    fetch();
    setAiSummary(null);
  }, [date]);

  const generateReport = async () => {
    setLoadingAi(true);
    const summary = await GeminiService.generateDailySummary(date, records);
    setAiSummary(summary);
    setLoadingAi(false);
  };

  return (
    <div className="p-6 pb-24 animate-fade-in">
      <h2 className="text-3xl font-black text-stone-900 mb-6">Logs</h2>
      <div className="bg-white p-4 rounded-2xl border border-stone-200 mb-6 flex items-center justify-between">
        <span className="font-bold text-stone-600">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</span>
        <div className="relative">
          <Calendar className="w-5 h-5 text-primary-500" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>
      </div>
      
      {records.length > 0 ? (
        <div className="space-y-4">
          <button 
            onClick={generateReport} 
            disabled={loadingAi}
            className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 transition-all"
          >
            {loadingAi ? 'Analyzing...' : <><Share2 className="w-5 h-5" /> Generate AI Summary</>}
          </button>
          {aiSummary && (
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm text-stone-700 whitespace-pre-wrap text-sm leading-relaxed animate-fade-in">
              {aiSummary}
            </div>
          )}
          <div className="bg-white rounded-3xl p-4 border border-stone-100 divide-y divide-stone-50">
            {records.map(r => (
              <div key={r.id} className="py-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-stone-800">{r.sewadarName}</p>
                  <p className="text-xs text-stone-400">{r.counterName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold">{formatTime12Hour(r.inTime)} - {formatTime12Hour(r.outTime) || 'Present'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-stone-400 font-medium">No activity for this date.</div>
      )}
    </div>
  );
};

const TeamPage: React.FC = () => {
  const [list, setList] = useState<Sewadar[]>([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const fetch = async () => setList(await StorageService.getSewadars());
    fetch();
  }, []);

  const filtered = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 pb-24 animate-fade-in">
      <h2 className="text-3xl font-black text-stone-900 mb-6">Team</h2>
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-primary-500/20 outline-none" />
      </div>
      <div className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center justify-between">
            <span className="font-bold text-stone-800">{s.name}</span>
            <button onClick={async () => { if(confirm('Delete member?')) setList(await StorageService.deleteSewadar(s.id)); }} className="text-stone-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

function AppContent() {
  const location = useLocation();
  const isWelcomePage = location.pathname === '/';
  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans text-stone-900">
      {!isWelcomePage && <TopHeader />}
      <div className="max-w-md mx-auto min-h-screen bg-[#FAFAF9] shadow-2xl relative">
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-stone-200 border-t-primary-500 rounded-full animate-spin"></div></div>}>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/sewadars" element={<TeamPage />} />
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
