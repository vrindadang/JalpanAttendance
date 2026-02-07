import React, { useState, useEffect, useRef, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Home, 
  History, 
  Users, 
  Calendar, 
  Share2, 
  Plus, 
  ArrowRight, 
  UserPlus, 
  Search, 
  Trash2, 
  MoreVertical, 
  Edit2, 
  X, 
  Download, 
  Check, 
  Sparkles, 
  Clock, 
  FileText, 
  FileBarChart, 
  ChevronDown,
  AlertCircle,
  LayoutDashboard,
  ShieldCheck,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { AttendanceRecord, Sewadar, Counter } from './types';
import { StorageService } from './services/storageService';
import { AttendanceList } from './components/AttendanceList';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Fix: Correctly define types for props and state and explicitly declare state property to resolve "Property 'state' does not exist" errors
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    // Fix: Access state via this.state
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-6 py-2 rounded-xl">Reload App</button>
        </div>
      );
    }
    // Fix: Access props via this.props and ensure children is handled as optional for JSX compatibility
    return this.props.children;
  }
}

// --- Utils ---
const formatTime12Hour = (time24: string | null) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const calculateDuration = (inTime: string, outTime: string | null) => {
  if (!outTime) return "Active";
  const [inH, inM] = inTime.split(':').map(Number);
  const [outH, outM] = outTime.split(':').map(Number);
  let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
  if (diffMins < 0) diffMins += 24 * 60;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// --- Custom Components ---

const CustomTimePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const parse = (val: string) => {
    if (!val) return { h: '12', m: '00', p: 'AM' };
    const [hh, mm] = val.split(':');
    let hNum = parseInt(hh, 10);
    const p = hNum >= 12 ? 'PM' : 'AM';
    hNum = hNum % 12 || 12;
    return { h: hNum.toString().padStart(2, '0'), m: mm, p };
  };

  const [parts, setParts] = useState(parse(value));
  useEffect(() => setParts(parse(value)), [value]);

  const update = (h: string, m: string, p: string) => {
    let hNum = parseInt(h, 10);
    if (p === 'PM' && hNum !== 12) hNum += 12;
    if (p === 'AM' && hNum === 12) hNum = 0;
    onChange(`${hNum.toString().padStart(2, '0')}:${m}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="flex gap-2">
      <select value={parts.h} onChange={(e) => update(e.target.value, parts.m, parts.p)} className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-center outline-none focus:ring-2 focus:ring-primary-500/20">
        {hours.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <select value={parts.m} onChange={(e) => update(parts.h, e.target.value, parts.p)} className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-center outline-none focus:ring-2 focus:ring-primary-500/20">
        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select value={parts.p} onChange={(e) => update(parts.h, parts.m, e.target.value)} className="flex-1 bg-slate-900 text-white p-3 rounded-xl font-bold text-center outline-none">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
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
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={search}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
        placeholder={placeholder}
        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all"
      />
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-scale-in">
          {filtered.length > 0 ? filtered.map(o => (
            <div key={o.id} onClick={() => { onChange(o.id); setSearch(o.name); setIsOpen(false); }} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 font-medium">
              {o.name}
            </div>
          )) : search && (
            <button onClick={() => { onAddNew(search); setIsOpen(false); }} className="w-full p-4 text-left text-primary-600 font-bold bg-primary-50 flex items-center justify-between">
              Add "{search}" <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// --- Pages ---

const WelcomePage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-24 h-24 bg-primary-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-primary-600/20">
        <ShieldCheck className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Jalpan<span className="text-primary-600">Sewa</span></h1>
      <p className="text-slate-500 font-medium mb-12 text-center max-w-[240px]">Smart Attendance Portal for Sewadars</p>
      <button onClick={() => navigate('/home')} className="w-full max-w-xs py-5 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 active:scale-95 transition-all">
        Enter Portal <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

const HomePage = () => {
  const [sewadars, setSewadars] = useState<Sewadar[]>([]);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState(getTodayString());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSewadar, setSelectedSewadar] = useState('');
  const [selectedCounter, setSelectedCounter] = useState('');
  const [inTime, setInTime] = useState('');
  const [markOutId, setMarkOutId] = useState<string | null>(null);
  const [manualOutTime, setManualOutTime] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setSewadars(await StorageService.getSewadars());
      setCounters(await StorageService.getCounters());
    };
    fetch();
    const now = new Date();
    setInTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  }, []);

  useEffect(() => { loadRecords(); }, [date]);

  const loadRecords = async () => setRecords(await StorageService.getRecordsByDate(date));

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = sewadars.find(x => x.id === selectedSewadar);
    const c = counters.find(x => x.id === selectedCounter);
    if (!s || !c) return;
    await StorageService.saveRecord({
      id: Date.now().toString(),
      sewadarName: s.name,
      counterName: c.name,
      date,
      inTime,
      outTime: null,
      timestamp: Date.now()
    });
    loadRecords();
    setIsFormOpen(false);
  };

  const confirmMarkOut = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = records.find(x => x.id === markOutId);
    if (r) {
      await StorageService.saveRecord({ ...r, outTime: manualOutTime });
      loadRecords();
    }
    setMarkOutId(null);
  };

  const onMarkOut = (r: AttendanceRecord) => {
    const now = new Date();
    setManualOutTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setMarkOutId(r.id);
  };

  const activeRecords = records.filter(r => !r.outTime);

  return (
    <div className="p-6 pb-24 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Live Status</h2>
          <div className="relative group flex items-center gap-2">
            <h3 className="text-3xl font-black text-slate-900">
              {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </h3>
            <ChevronDown className="w-5 h-5 text-slate-300" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="w-14 h-14 bg-primary-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary-600/30 hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-8 h-8" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 mb-2">On Duty</p>
          <p className="text-3xl font-black text-primary-600">{activeRecords.length}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-xs font-bold text-slate-400 mb-2">Total Today</p>
          <p className="text-3xl font-black text-slate-900">{records.length}</p>
        </div>
      </div>

      <div>
        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-500" /> Current Feed
        </h4>
        <AttendanceList records={records} onMarkOut={onMarkOut} onDelete={async (id) => { await StorageService.deleteRecord(id); loadRecords(); }} />
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-6 animate-slide-up space-y-6">
            <h3 className="text-xl font-bold flex justify-between items-center">New Entry <button onClick={() => setIsFormOpen(false)}><X className="w-6 h-6 text-slate-300"/></button></h3>
            <div className="space-y-4">
              <SearchableSelect options={sewadars} value={selectedSewadar} onChange={setSelectedSewadar} onAddNew={async (n) => setSewadars(await StorageService.addSewadar(n))} placeholder="Sewadar Name..." />
              <SearchableSelect options={counters} value={selectedCounter} onChange={setSelectedCounter} onAddNew={async (n) => setCounters(await StorageService.addCounter(n))} placeholder="Sewa Area..." />
              <CustomTimePicker value={inTime} onChange={setInTime} />
              <button onClick={handleCheckIn} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-lg">Confirm Check-In</button>
            </div>
          </div>
        </div>
      )}

      {markOutId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setMarkOutId(null)} />
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 relative z-10 text-center space-y-6 animate-scale-in">
            <div className="w-16 h-16 bg-slate-50 text-primary-600 rounded-full flex items-center justify-center mx-auto"><Clock className="w-8 h-8"/></div>
            <h3 className="text-xl font-bold">Mark Out Time</h3>
            <CustomTimePicker value={manualOutTime} onChange={setManualOutTime} />
            <button onClick={confirmMarkOut} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold">Complete Shift</button>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryPage = () => {
  const [date, setDate] = useState(getTodayString());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  useEffect(() => {
    const fetch = async () => setRecords(await StorageService.getRecordsByDate(date));
    fetch();
  }, [date]);

  const handleShare = () => {
    let text = `*Jalpan Sewa Report - ${date}*\n\n`;
    records.forEach((r, i) => {
      text += `${i+1}. ${r.sewadarName} (${r.counterName})\n   ${formatTime12Hour(r.inTime)} - ${formatTime12Hour(r.outTime) || 'On Duty'}\n`;
    });
    navigator.clipboard.writeText(text);
    alert('Report copied to clipboard!');
  };

  return (
    <div className="p-6 pb-24 space-y-8 animate-fade-in">
      <h2 className="text-3xl font-black text-slate-900">History</h2>
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase">Select Date</label>
        <div className="relative">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center font-bold">
            {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </div>
      </div>
      {records.length > 0 ? (
        <div className="space-y-4">
          <button onClick={handleShare} className="w-full p-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3">
            <Share2 className="w-5 h-5" /> Share Summary
          </button>
          <div className="bg-white rounded-3xl p-4 border border-slate-100 divide-y divide-slate-50">
            {records.map(r => (
              <div key={r.id} className="py-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800">{r.sewadarName}</p>
                  <p className="text-xs text-slate-400 font-medium">{r.counterName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-600">{formatTime12Hour(r.inTime)} - {formatTime12Hour(r.outTime) || '...'}</p>
                  <p className="text-[10px] text-primary-600 font-bold uppercase">{calculateDuration(r.inTime, r.outTime)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400 font-medium">No records found for this date</div>
      )}
    </div>
  );
};

const SewadarsPage = () => {
  const [list, setList] = useState<Sewadar[]>([]);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const fetch = async () => setList(await StorageService.getSewadars());
    fetch();
  }, []);

  const filtered = list.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 pb-24 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-900">Team</h2>
        <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">{list.length}</span>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team members..." className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary-500/10 transition-all font-medium" />
      </div>
      <div className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-bold text-slate-400">{s.name.charAt(0)}</div>
              <p className="font-bold text-slate-800">{s.name}</p>
            </div>
            <button onClick={async () => { if(confirm('Delete member?')) setList(await StorageService.deleteSewadar(s.id)); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- App Wrap ---

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 flex-1 py-2 transition-all ${active ? 'text-primary-600' : 'text-slate-400'}`}>
      <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {active && <div className="w-1 h-1 bg-primary-600 rounded-full mt-0.5" />}
    </Link>
  );
};

const Layout = () => {
  const loc = useLocation();
  const isWelcome = loc.pathname === '/';
  if (isWelcome) return <Routes><Route path="/" element={<WelcomePage />} /><Route path="*" element={<Navigate to="/" />} /></Routes>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 max-w-lg mx-auto shadow-2xl overflow-hidden">
      <header className="glass px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-sm">JS</div>
          <h1 className="font-extrabold text-slate-900 tracking-tight">Jalpan<span className="text-primary-600">Sewa</span></h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/sewadars" element={<SewadarsPage />} />
          <Route path="*" element={<Navigate to="/home" />} />
        </Routes>
      </main>
      <nav className="bg-white border-t border-slate-100 flex items-center justify-around px-4 pb-safe-area-bottom h-20 shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
        <NavItem to="/home" icon={LayoutDashboard} label="Home" />
        <NavItem to="/sewadars" icon={Users} label="Team" />
        <NavItem to="/history" icon={History} label="Logs" />
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div></div>}>
          <Layout />
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
}