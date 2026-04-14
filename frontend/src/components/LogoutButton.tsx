/* eslint-disable no-console */

'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { clearAuthInfo } from '@/lib/auth';

export const LogoutButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);

    try {
      await apiClient.logout();
    } catch (error) {
      console.error('注销请求失败:', error);
    } finally {
      clearAuthInfo();
    }

    window.location.reload();
  };

  return (
    <button
      onClick={handleLogout}
      className='flex h-10 w-10 items-center justify-center rounded-full p-2 text-neutral-300 transition-colors hover:bg-white/10 hover:text-[#d4af37]'
      aria-label='Logout'
    >
      <LogOut className='w-full h-full' />
    </button>
  );
};
