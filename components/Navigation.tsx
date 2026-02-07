import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, History, Users } from 'lucide-react';

export const TopHeader: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-stone-200 border border-stone-100 font-black text-xl tracking-tighter leading-none">
          <span className="text-stone-900">J</span><span className="text-primary-600">S</span>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-800 leading-none">Jalpan<span className="text-primary-600">Sewa</span></h1>
        </div>
      </div>
    </header>
  );
};

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300 ${
          isActive 
            ? 'bg-stone-900 text-white shadow-xl shadow-stone-900/20' 
            : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
        }`}
      >
        <Icon 
          className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-100' : 'scale-100'}`} 
          strokeWidth={isActive ? 2.5 : 2} 
        />
        {isActive && (
          <span className="text-sm font-bold whitespace-nowrap animate-fade-in tracking-wide">
            {label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <nav className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-white/50 p-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center gap-2">
        <NavItem to="/home" icon={Home} label="Home" />
        <NavItem to="/sewadars" icon={Users} label="Team" />
        <NavItem to="/history" icon={History} label="History" />
      </nav>
    </div>
  );
};