import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import {
  Award,
  LayoutDashboard,
  PlusCircle,
  History,
  FileText,
  Menu,
  X,
  ExternalLink,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getHealth } from '../services/api';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(null); // null = checking, true, false
  const location = useLocation();

  const checkApiHealth = async () => {
    try {
      await getHealth();
      setApiConnected(true);
    } catch (err) {
      setApiConnected(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Overview', to: '/', icon: LayoutDashboard },
    { name: 'Generate Certificates', to: '/create', icon: PlusCircle },
    { name: 'Generation History', to: '/history', icon: History },
  ];

  // Helper for title/subtitle based on current path
  const getPageHeader = () => {
    if (location.pathname === '/') {
      return {
        title: 'Operations Overview',
        subtitle: 'Monitor bulk generation pipelines, throughput, and system status.',
      };
    }
    if (location.pathname === '/create') {
      return {
        title: 'Generate Certificates',
        subtitle: 'Configure a new bulk batch with custom certificate attributes and recipients.',
      };
    }
    if (location.pathname === '/history') {
      return {
        title: 'Generation History',
        subtitle: 'Search, audit, and inspect past certificate generation runs.',
      };
    }
    if (location.pathname.startsWith('/jobs/')) {
      return {
        title: 'Job Progress & Audit',
        subtitle: 'Real-time recipient processing telemetry, error tracking, and secure downloads.',
      };
    }
    return {
      title: 'Certificate Studio',
      subtitle: 'Enterprise bulk certificate issuance system.',
    };
  };

  const header = getPageHeader();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Logo / Brand Header */}
          <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                <Award className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 tracking-tight text-base leading-tight">
                  Certificate Studio
                </span>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Enterprise Bulk Engine
                </span>
              </div>
            </Link>
            <button
              type="button"
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-md"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Secondary Actions / Documentation */}
          <div className="px-4 pt-2">
            <div className="border-t border-slate-100 pt-3">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                  <span>Interactive API Docs</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Certificate Studio</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 text-[10px] font-semibold">
              v1.0.0
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">FastAPI & SQLite Core</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight leading-tight">
                {header.title}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {header.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live API Health Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                apiConnected === true
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : apiConnected === false
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={
                apiConnected === true
                  ? 'FastAPI backend is responsive and connected'
                  : 'FastAPI backend connection unreachable'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  apiConnected === true
                    ? 'bg-emerald-500 animate-pulse'
                    : apiConnected === false
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`}
              />
              <span className="hidden sm:inline">
                {apiConnected === true
                  ? 'API Connected'
                  : apiConnected === false
                  ? 'API Offline'
                  : 'Checking API...'}
              </span>
            </div>

            {/* Quick Action Button */}
            {location.pathname !== '/create' && (
              <Link
                to="/create"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Job</span>
              </Link>
            )}
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
