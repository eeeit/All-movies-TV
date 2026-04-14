/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import { Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLanguage } from './LanguageProvider';

export const SettingsButton: React.FC = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [defaultAggregateSearch, setDefaultAggregateSearch] = useState(true);
  const [doubanProxyUrl, setDoubanProxyUrl] = useState('');
  const [imageProxyUrl, setImageProxyUrl] = useState('');
  const [enableOptimization, setEnableOptimization] = useState(true);
  const [enableImageProxy, setEnableImageProxy] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 从 localStorage 读取设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAggregateSearch = localStorage.getItem(
        'defaultAggregateSearch'
      );
      if (savedAggregateSearch !== null) {
        setDefaultAggregateSearch(JSON.parse(savedAggregateSearch));
      }

      const savedDoubanProxyUrl = localStorage.getItem('doubanProxyUrl');
      if (savedDoubanProxyUrl !== null) {
        setDoubanProxyUrl(savedDoubanProxyUrl);
      }

      const savedEnableImageProxy = localStorage.getItem('enableImageProxy');
      const defaultImageProxy =
        (window as any).RUNTIME_CONFIG?.IMAGE_PROXY || '';
      if (savedEnableImageProxy !== null) {
        setEnableImageProxy(JSON.parse(savedEnableImageProxy));
      } else if (defaultImageProxy) {
        // 如果有默认图片代理配置，则默认开启
        setEnableImageProxy(true);
      }

      const savedImageProxyUrl = localStorage.getItem('imageProxyUrl');
      if (savedImageProxyUrl !== null) {
        setImageProxyUrl(savedImageProxyUrl);
      } else if (defaultImageProxy) {
        setImageProxyUrl(defaultImageProxy);
      }

      const savedEnableOptimization =
        localStorage.getItem('enableOptimization');
      if (savedEnableOptimization !== null) {
        setEnableOptimization(JSON.parse(savedEnableOptimization));
      }
    }
  }, []);

  // 保存设置到 localStorage
  const handleAggregateToggle = (value: boolean) => {
    setDefaultAggregateSearch(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(value));
    }
  };

  const handleDoubanProxyUrlChange = (value: string) => {
    setDoubanProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('doubanProxyUrl', value);
    }
  };

  const handleImageProxyUrlChange = (value: string) => {
    setImageProxyUrl(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('imageProxyUrl', value);
    }
  };

  const handleOptimizationToggle = (value: boolean) => {
    setEnableOptimization(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableOptimization', JSON.stringify(value));
    }
  };

  const handleImageProxyToggle = (value: boolean) => {
    setEnableImageProxy(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('enableImageProxy', JSON.stringify(value));
    }
  };

  const handleSettingsClick = () => {
    setIsOpen(!isOpen);
  };

  const handleClosePanel = () => {
    setIsOpen(false);
  };

  // 重置所有设置为默认值
  const handleResetSettings = () => {
    const defaultImageProxy = (window as any).RUNTIME_CONFIG?.IMAGE_PROXY || '';

    // 重置所有状态
    setDefaultAggregateSearch(true);
    setEnableOptimization(true);
    setDoubanProxyUrl('');
    setEnableImageProxy(!!defaultImageProxy);
    setImageProxyUrl(defaultImageProxy);

    // 保存到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('defaultAggregateSearch', JSON.stringify(true));
      localStorage.setItem('enableOptimization', JSON.stringify(true));
      localStorage.setItem('doubanProxyUrl', '');
      localStorage.setItem(
        'enableImageProxy',
        JSON.stringify(!!defaultImageProxy)
      );
      localStorage.setItem('imageProxyUrl', defaultImageProxy);
    }
  };

  // 设置面板内容
  const settingsPanel = (
    <>
      {/* 背景遮罩 */}
      <div
        className='fixed inset-0 bg-black/70 backdrop-blur-sm z-[1000]'
        onClick={handleClosePanel}
      />

      {/* 设置面板 */}
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#161616] text-neutral-100 rounded-2xl border border-white/8 shadow-[0_30px_90px_rgba(0,0,0,0.55)] z-[1001] p-6'>
        {/* 标题栏 */}
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <h3 className='text-xl font-bold text-neutral-100'>
              {t('localSettings')}
            </h3>
            <button
              onClick={handleResetSettings}
              className='px-2 py-1 text-xs text-[#f0b90b] hover:text-white border border-[#f0b90b]/30 hover:border-[#f0b90b]/60 hover:bg-[#f0b90b]/10 rounded transition-colors'
              title={t('resetSettingsTooltip')}
            >
              {t('reset')}
            </button>
          </div>
          <button
            onClick={handleClosePanel}
            className='w-8 h-8 p-1 rounded-full flex items-center justify-center text-neutral-400 hover:bg-white/5 hover:text-[#f0b90b] transition-colors'
            aria-label={t('cancel')}
          >
            <X className='w-full h-full' />
          </button>
        </div>

        {/* 设置项 */}
        <div className='space-y-6'>
          {/* 默认聚合搜索结果 */}
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-medium text-neutral-200'>
                {t('defaultAggregateSearch')}
              </h4>
              <p className='text-xs text-neutral-400 mt-1'>
                {t('defaultAggregateSearchDesc')}
              </p>
            </div>
            <label className='flex items-center cursor-pointer'>
              <div className='relative'>
                <input
                  type='checkbox'
                  className='sr-only peer'
                  checked={defaultAggregateSearch}
                  onChange={(e) => handleAggregateToggle(e.target.checked)}
                />
                <div className='w-11 h-6 bg-white/10 rounded-full peer-checked:bg-[#f0b90b]/70 transition-colors'></div>
                <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
              </div>
            </label>
          </div>

          {/* 优选和测速 */}
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-medium text-neutral-200'>
                {t('enableOptimization')}
              </h4>
              <p className='text-xs text-neutral-400 mt-1'>
                {t('enableOptimizationDesc')}
              </p>
            </div>
            <label className='flex items-center cursor-pointer'>
              <div className='relative'>
                <input
                  type='checkbox'
                  className='sr-only peer'
                  checked={enableOptimization}
                  onChange={(e) => handleOptimizationToggle(e.target.checked)}
                />
                <div className='w-11 h-6 bg-white/10 rounded-full peer-checked:bg-[#f0b90b]/70 transition-colors'></div>
                <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
              </div>
            </label>
          </div>

          {/* 豆瓣代理设置 */}
          <div className='space-y-3'>
            <div>
              <h4 className='text-sm font-medium text-neutral-200'>
                {t('doubanProxy')}
              </h4>
              <p className='text-xs text-neutral-400 mt-1'>
                {t('doubanProxyDesc')}
              </p>
            </div>
            <input
              type='text'
              className='w-full px-3 py-2 border border-white/10 rounded-md text-sm bg-[#111111] text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#f0b90b]/40 focus:border-transparent'
              placeholder='https://proxy.example.com/fetch?url='
              value={doubanProxyUrl}
              onChange={(e) => handleDoubanProxyUrlChange(e.target.value)}
            />
          </div>

          {/* 图片代理开关 */}
          <div className='flex items-center justify-between'>
            <div>
              <h4 className='text-sm font-medium text-neutral-200'>
                {t('enableImageProxy')}
              </h4>
              <p className='text-xs text-neutral-400 mt-1'>
                {t('enableImageProxyDesc')}
              </p>
            </div>
            <label className='flex items-center cursor-pointer'>
              <div className='relative'>
                <input
                  type='checkbox'
                  className='sr-only peer'
                  checked={enableImageProxy}
                  onChange={(e) => handleImageProxyToggle(e.target.checked)}
                />
                <div className='w-11 h-6 bg-white/10 rounded-full peer-checked:bg-[#f0b90b]/70 transition-colors'></div>
                <div className='absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5'></div>
              </div>
            </label>
          </div>

          {/* 图片代理地址设置 */}
          <div className='space-y-3'>
            <div>
              <h4 className='text-sm font-medium text-neutral-200'>
                {t('imageProxyUrl')}
              </h4>
              <p className='text-xs text-neutral-400 mt-1'>
                {t('imageProxyUrlDesc')}
              </p>
            </div>
            <input
              type='text'
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#f0b90b] focus:border-transparent transition-colors ${
                enableImageProxy
                  ? 'border-white/10 bg-[#111111] text-neutral-100 placeholder-neutral-500'
                  : 'border-white/5 bg-white/5 text-neutral-500 placeholder-neutral-600 cursor-not-allowed'
              }`}
              placeholder='https://imageproxy.example.com/?url='
              value={imageProxyUrl}
              onChange={(e) => handleImageProxyUrlChange(e.target.value)}
              disabled={!enableImageProxy}
            />
          </div>
        </div>

        {/* 底部说明 */}
        <div className='mt-6 pt-4 border-t border-white/8'>
          <p className='text-xs text-neutral-500 text-center'>
            {t('settingsSavedLocally')}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={handleSettingsClick}
        className='w-8 h-8 sm:w-10 sm:h-10 p-[6px] sm:p-2 rounded-full flex items-center justify-center text-neutral-300 hover:bg-white/5 hover:text-[#f0b90b] transition-colors'
      >
        <Settings className='w-full h-full' />
      </button>

      {/* 使用 Portal 将设置面板渲染到 document.body */}
      {isOpen && mounted && createPortal(settingsPanel, document.body)}
    </>
  );
};
