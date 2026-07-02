import React from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Page } from '@/shared/types/appTypes';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  title?: string;
}

export function Layout({ children, currentPage, onNavigate, title }: LayoutProps) {
  const isDashboard = currentPage === 'dashboard';
  const isLogin = currentPage === 'login' || currentPage === 'signup';

  const handleBack = () => {
    if (isDashboard) {
      onNavigate('login');
    } else if (currentPage === 'signup') {
      onNavigate('login');
    } else if (currentPage === 'assessment-form') {
      onNavigate('dashboard');
    } else if (currentPage === 'risk-result') {
      // User expects to go back to Dashboard (List) from Result view
      onNavigate('dashboard');
    } else {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-800">
      {!isLogin && (
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 sticky top-0 z-20 shadow-sm">
          <div className="w-full max-w-7xl mx-auto flex items-center">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-slate-600 mr-4"
              aria-label={isDashboard ? "Logout" : "Go back"}
            >
              {isDashboard ? <LogOut size={20} /> : <ArrowLeft size={20} />}
            </button>
            <h1 className="font-bold text-xl text-[#2F8F6B]">
              {title || "If - 고령자 위험도 판단 시스템"}
            </h1>
          </div>
        </header>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 relative">
        {children}
      </main>
    </div>
  );
}
