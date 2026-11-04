import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  LayoutDashboard,
  FileCheck2,
  Calendar,
  History,
  Award,
  Bell,
  User,
  LogOut,
  GraduationCap,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseStatusBanner } from '../components/common/DatabaseStatusBanner';
import { DatabaseStatusIndicator } from '../components/common/DatabaseStatusIndicator';

export const StudentLayout: React.FC = () => {
  const { user, verification, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string } | null>(null);

  useEffect(() => {
    refreshProfile();
    api.student.getNotifications().then((res) => {
      const unread = res.notifications.filter((n) => !n.is_read).length;
      setUnreadNotifsCount(unread);
    }).catch(() => {});

    api.auth.getDbStatus().then((res) => {
      setDbStatus(res);
    }).catch(() => {
      setDbStatus({ connected: false, message: 'Database connection check failed' });
    });
  }, [location.pathname]);

  const isVerified = verification?.status === 'approved';

  const navItems = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    {
      name: 'Available Exams',
      path: '/student/available-exams',
      icon: FileCheck2,
      locked: !isVerified,
    },
    {
      name: 'Upcoming Exams',
      path: '/student/upcoming-exams',
      icon: Calendar,
      locked: !isVerified,
    },
    {
      name: 'Exam History',
      path: '/student/history',
      icon: History,
      locked: !isVerified,
    },
    {
      name: 'Results & Rank',
      path: '/student/results',
      icon: Award,
      locked: !isVerified,
    },
    {
      name: 'Notifications',
      path: '/student/notifications',
      icon: Bell,
      badge: unreadNotifsCount > 0 ? String(unreadNotifsCount) : undefined,
    },
    { name: 'My Profile', path: '/student/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/auth/student-login');
  };

  const currentItem = navItems.find((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      <DatabaseStatusBanner />

      {/* Verification Status Warning Ribbon if Pending or Rejected */}
      {verification && verification.status === 'pending' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-amber-100 text-amber-700">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <span>
              <strong>College ID Verification In Progress:</strong> Your submitted ID is awaiting proctor verification. Exams will unlock once verified.
            </span>
          </div>
          <NavLink
            to="/student/profile"
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline flex items-center gap-1"
          >
            Track Status &rarr;
          </NavLink>
        </div>
      )}

      {verification && verification.status === 'rejected' && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs text-rose-900 flex flex-wrap items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <span>
              <strong>Verification Rejected:</strong> {verification.rejection_reason || 'Please upload a clear official College ID.'}
            </span>
          </div>
          <NavLink
            to="/student/profile"
            className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg transition shadow-xs"
          >
            Resubmit ID Card
          </NavLink>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none shadow-[2px_0_8px_-4px_rgba(0,0,0,0.04)]">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5 text-base">
                Exam<span className="text-blue-600">Pro</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Student
                </span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Academic Portal</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    } ${item.locked ? 'opacity-65' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="student-active-pill"
                          className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {item.badge}
                        </span>
                      )}
                      {item.locked && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md">
                          Locked
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Student Status Summary Card */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/70">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 mb-2 shadow-xs">
              <div className="flex items-center gap-2.5 mb-2">
                <img
                  src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=128'}
                  alt={user?.full_name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>

              {/* Status pill */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-medium">ID Status:</span>
                {verification?.status === 'approved' ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                  </span>
                ) : verification?.status === 'pending' ? (
                  <span className="text-amber-700 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" /> Pending
                  </span>
                ) : (
                  <span className="text-rose-700 font-semibold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Rejected
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 bg-white border border-slate-200 transition-all duration-150 cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile Header and Main Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="hidden sm:inline">Academic Portal</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                <span className="font-semibold text-slate-900">{currentItem?.name || 'Dashboard'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Global Database Status Indicator */}
              <DatabaseStatusIndicator />

              <NavLink
                to="/student/notifications"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                )}
              </NavLink>

              <NavLink
                to="/student/profile"
                className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition"
              >
                <img
                  src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=128'}
                  alt={user?.full_name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                />
                <span className="hidden sm:block text-xs font-semibold text-slate-700">
                  {user?.full_name?.split(' ')[0]}
                </span>
              </NavLink>
            </div>
          </header>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1 shadow-lg max-h-[70vh] overflow-y-auto"
              >
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                          isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                        } ${item.locked ? 'opacity-60' : ''}`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.locked && (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          Locked
                        </span>
                      )}
                    </NavLink>
                  );
                })}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
