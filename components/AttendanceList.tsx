import React from 'react';
import { AttendanceRecord } from '../types';
import { Clock, CheckCircle2, CircleDashed, Trash2 } from 'lucide-react';

interface AttendanceListProps {
  records: AttendanceRecord[];
  onMarkOut: (record: AttendanceRecord) => void;
  onDelete: (id: string) => void;
}

const formatTime12Hour = (time24: string | null) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

export const AttendanceList: React.FC<AttendanceListProps> = ({ records, onMarkOut, onDelete }) => {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
          <Clock className="w-8 h-8 text-stone-300" />
        </div>
        <h3 className="text-lg font-bold text-stone-700">No Activity Yet</h3>
        <p className="text-sm text-stone-400 max-w-[200px]">Start by checking in a sewadar for their duty.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {records.map((record, index) => {
        const isComplete = !!record.outTime;
        const initials = record.sewadarName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        return (
          <div 
            key={record.id} 
            className={`group relative overflow-hidden rounded-2xl transition-all duration-300 animate-slide-up ${
              isComplete 
                ? 'bg-white/60 border border-stone-200' 
                : 'bg-white border-l-[6px] border-l-primary-500 border-y border-r border-stone-100 shadow-sm'
            }`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="p-4 flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-inner ${
                    isComplete ? 'bg-stone-100 text-stone-400' : 'bg-primary-50 text-primary-700'
                }`}>
                  {initials}
                </div>

                {/* Info */}
                <div>
                  <h3 className={`font-bold text-[15px] leading-tight mb-1 ${isComplete ? 'text-stone-500' : 'text-stone-800'}`}>
                    {record.sewadarName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                        {record.counterName}
                    </span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm(`Delete entry for ${record.sewadarName}?`)) {
                                onDelete(record.id);
                            }
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-1 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        title="Delete Entry"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions & Status */}
              <div className="flex flex-col items-end justify-center gap-3 min-w-[85px]">
                
                {/* In Time */}
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none mb-1">In Time</span>
                    <span className="text-sm font-bold text-stone-800 leading-none">
                        {formatTime12Hour(record.inTime)}
                    </span>
                </div>

                {/* Out Time or Mark Out Button */}
                {!isComplete ? (
                  <button
                    onClick={() => onMarkOut(record)}
                    className="flex items-center gap-1.5 pl-3 pr-4 py-1.5 bg-stone-900 text-white text-xs font-bold rounded-full shadow-lg shadow-stone-900/20 active:scale-95 transition-transform"
                  >
                    <CircleDashed className="w-3.5 h-3.5 animate-spin-slow text-primary-400" />
                    Mark Out
                  </button>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none mb-1">Out Time</span>
                    <span className="text-sm font-bold text-primary-600 leading-none">
                        {formatTime12Hour(record.outTime)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};