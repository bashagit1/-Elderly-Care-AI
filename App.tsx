import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import StaffDashboard from './components/StaffDashboard';
import AdminDashboard from './components/AdminDashboard';
import { UserRole } from './types';
import { Shield, User, LogOut, Heart, Sparkles, Moon, Sun } from 'lucide-react';
import { IS_LIVE_MODE } from './services/config';

const Layout: React.FC<{ children: React.ReactNode; role: UserRole; onLogout: () => void; isDarkMode: boolean; toggleTheme: () => void }> = ({ children, role, onLogout, isDarkMode, toggleTheme }) => {
  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* Glassmorphism Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-3 group cursor-default">
                <div className="w-10 h-10 bg-gradient-to-tr from-brand-500 to-brand-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-200 dark:shadow-none group-hover:scale-105 transition-transform">
                   <Heart className="text-white w-6 h-6" fill="currentColor" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight leading-none">CareWatch</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">FAMILY CONNECT</span>
                </div>
                
                {IS_LIVE_MODE ? (
                  <span className="ml-2 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">Live</span>
                ) : (
                  <span className="ml-2 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Mock</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 dark:hover:text-amber-300 transition-all duration-200"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="hidden md:flex flex-col items-end mr-2">
                 <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Logged in as</span>
                 <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{role === UserRole.ADMIN ? 'Administrator' : 'Care Staff'}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all duration-200 border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-6 px-4">
        {children}
      </main>
    </div>
  );
};

const LoginSelection: React.FC<{ onSelect: (role: UserRole) => void; toggleTheme: () => void; isDarkMode: boolean }> = ({ onSelect, toggleTheme, isDarkMode }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      {/* Theme Toggle Absolute */}
      <button 
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-3 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md shadow-sm hover:scale-110 transition-all text-slate-600 dark:text-slate-300"
      >
         {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      {/* Background decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-rose-100 dark:bg-rose-900/20 rounded-full blur-3xl opacity-50 animate-pulse-slow" style={{animationDelay: '1.5s'}}></div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        <div className="mb-10 text-center animate-fade-in-up">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-200 dark:shadow-brand-900/50 rotate-3 hover:rotate-6 transition-transform duration-300">
              <Heart className="text-white w-10 h-10" fill="white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-3">
            Elderly Care Watch <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-indigo-600 dark:from-brand-400 dark:to-indigo-400">AI</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Bridging the gap between care homes and families with AI-powered updates.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-2xl">
          {/* Staff Card */}
          <button 
            onClick={() => onSelect(UserRole.STAFF)}
            className="group relative bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-brand-100 dark:hover:shadow-brand-900/20 transition-all duration-300 transform hover:-translate-y-1 border border-slate-100 dark:border-slate-700 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-brand-50 dark:bg-brand-900/20 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 ease-out opacity-50"></div>
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-600 group-hover:text-white transition-colors duration-300">
                <User className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">Caregiver Portal</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Log daily meals, vitals, and send happy moments to families.</p>
            </div>
          </button>

          {/* Admin Card */}
          <button 
            onClick={() => onSelect(UserRole.ADMIN)}
            className="group relative bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg hover:shadow-2xl hover:shadow-purple-100 dark:hover:shadow-purple-900/20 transition-all duration-300 transform hover:-translate-y-1 border border-slate-100 dark:border-slate-700 text-left overflow-hidden"
          >
             <div className="absolute top-0 right-0 bg-purple-50 dark:bg-purple-900/20 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 ease-out opacity-50"></div>
             
             <div className="relative z-10">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                <Shield className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Admin Console</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Manage residents, connect WhatsApp bot, and monitor logs.</p>
            </div>
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-6 text-slate-400 dark:text-slate-500 text-sm font-medium flex items-center space-x-1">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span>Powered by Gemini AI</span>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Check local storage or system preference
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      document.body.classList.add('dark'); // Ensure body gets class for full gradient
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const handleLogout = () => {
    setUserRole(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          userRole ? <Navigate to={userRole === UserRole.ADMIN ? '/admin' : '/staff'} replace /> : <LoginSelection onSelect={setUserRole} toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
        } />
        
        <Route path="/staff" element={
          userRole === UserRole.STAFF ? (
            <Layout role={UserRole.STAFF} onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
              <StaffDashboard />
            </Layout>
          ) : (
            <Navigate to="/" replace />
          )
        } />
        
        <Route path="/admin" element={
          userRole === UserRole.ADMIN ? (
            <Layout role={UserRole.ADMIN} onLogout={handleLogout} isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
              <AdminDashboard />
            </Layout>
          ) : (
            <Navigate to="/" replace />
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;