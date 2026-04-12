/* eslint-disable no-console */

'use client';

import { LogOut } from 'lucide-react';
import { useState } from 'react';

export const LogoutButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);

    try {
      // 调用注销API来清除cookie
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('注销请求失败:', error);
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
