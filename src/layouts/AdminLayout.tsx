import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  BookOpen,
  CalendarDays,
  FileSpreadsheet,
  HelpCircle,
  UserPlus,
  Radio,
  Award,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  GraduationCap,
  ChevronRight,
  Shield,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingVerifCount, setPendingVerifCount] = useState<number>(0);
  const [activeAttemptsCount, setActiveAttemptsCount] = useState<number>(0);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string } | null>(null);

  useEffect(() => {
    // Fetch stats for badge counts
    api.admin.getDashboard().then((res) => {
      setPendingVerifCount(res.stats?.pendingVerifications || 0);
      setActiveAttemptsCount(res.stats?.activeExams || 0);
    }).catch(() => {});

    api.auth.getDbStatus().then((res) => {
      setDbStatus(res);
    }).catch(() => {
      setDbStatus({ connected: false, message: 'Database connection check failed' });
    });
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    {
      name: 'Student Verification',
      path: '/admin/verifications',
      icon: ShieldAlert,
      badge: pendingVerifCount > 0 ? `${pendingVerifCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
    },
    { name: 'Student Management', path: '/admin/students', icon: Users },
    { name: 'Course Management', path: '/admin/courses', icon: BookOpen },
    { name: 'Semester Management', path: '/admin/semesters', icon: CalendarDays },
    { name: 'Exam Management', path: '/admin/exams', icon: FileSpreadsheet },
    { name: 'Question Management', path: '/admin/questions', icon: HelpCircle },
    { name: 'Exam Assignments', path: '/admin/assignments', icon: UserPlus },
    {
      name: 'Live Monitoring',
      path: '/admin/monitoring',
      icon: Radio,
      badge: 'LIVE',
      badgeColor: 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse font-bold',
    },
    { name: 'Results Management', path: '/admin/results', icon: Award },
    { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { name: 'Activity Logs', path: '/admin/activity-logs', icon: ScrollText },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/auth/admin-login');
  };

  const currentItem = navItems.find((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans">
      {dbStatus && !dbStatus.connected && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
            <span>Database Connection: {dbStatus.message}</span>
          </div>
          <span className="text-[11px] font-mono bg-amber-600/30 px-2 py-0.5 rounded">Standalone Mode</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none shadow-[2px_0_8px_-4px_rgba(0,0,0,0.04)]">
          {/* Brand header */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5 text-base">
                Exam<span className="text-blue-600">Pro</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Admin
                </span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium">Proctoring Controller</p>
            </div>
          </div>

          {/* Navigation Links */}
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
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="admin-active-pill"
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
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User profile card & Logout */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 mb-2 shadow-xs">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=128'}
                alt={user?.full_name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name}</p>
                <p className="text-[11px] text-blue-600 font-medium truncate flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Chief Proctor
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50/60 border border-rose-200/80 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area with Header */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Navigation Bar */}
          <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="hidden sm:inline">ExamPro Admin</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                <span className="font-semibold text-slate-900">{currentItem?.name || 'Portal'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick status pill */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-medium">System Online</span>
              </div>

              {/* Notification icon */}
              <div className="relative">
                <button
                  onClick={() => navigate('/admin/verifications')}
                  title="Verification Alerts"
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer relative"
                >
                  <Bell className="w-4 h-4" />
                  {pendingVerifCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                  )}
                </button>
              </div>

              {/* Quick profile display */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <img
                  src={user?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=128'}
                  alt={user?.full_name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                />
                <span className="hidden sm:block text-xs font-semibold text-slate-700">
                  {user?.full_name?.split(' ')[0]}
                </span>
              </div>
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
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                          {item.badge}
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
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
