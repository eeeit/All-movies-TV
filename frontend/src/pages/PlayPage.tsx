import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useSearchParams } from 'react-router-dom';

import type { SearchResult } from '@shared/api-contract';

import AppShell from '@/components/AppShell';
import { useLanguage } from '@/components/LanguageProvider';
import {
  generateStorageKey,
  getAllPlayRecords,
  savePlayRecord,
} from '@/lib/db.client';
import { fetchVideoDetail } from '@/lib/fetchVideoDetail';
import { processImageUrl } from '@/lib/utils';

export default function PlayPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source')?.trim() || '';
  const id = searchParams.get('id')?.trim() || '';
  const fallbackTitle = searchParams.get('title')?.trim() || '';

  const [detail, setDetail] = useState<SearchResult | null>(null);
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const [resumeTime, setResumeTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const persistPlayRecord = useCallback(async () => {
    if (!detail || !source || !id || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const playTime = Math.floor(video.currentTime || 0);
    const duration = Number.isFinite(video.duration)
      ? Math.floor(video.duration)
      : 0;

    if (playTime < 1) {
      return;
    }

    await savePlayRecord(source, id, {
      title: detail.title,
      source_name: detail.source_name,
      year: detail.year,
      cover: detail.poster,
      index: episodeIndex + 1,
      total_episodes: detail.episodes.length || 1,
      play_time: playTime,
      total_time: duration,
      save_time: Date.now(),
      search_title: fallbackTitle || detail.title,
    });
  }, [detail, episodeIndex, fallbackTitle, id, source]);

  useEffect(() => {
    if (!source || !id) {
      setLoading(false);
      setError(t('missingParams'));
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      fetchVideoDetail({ source, id, fallbackTitle }),
      getAllPlayRecords(),
    ])
      .then(([nextDetail, records]) => {
        if (cancelled) {
          return;
        }

        const record = records[generateStorageKey(source, id)];
        const nextEpisodeIndex =
          record &&
          record.index > 0 &&
          record.index <= nextDetail.episodes.length
            ? record.index - 1
            : 0;

        setDetail(nextDetail);
        setEpisodeIndex(nextEpisodeIndex);
        setResumeTime(
          record && record.index - 1 === nextEpisodeIndex ? record.play_time : 0
        );
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : t('videoDetailFailed')
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackTitle, id, source, t]);

  const currentEpisodeUrl = detail?.episodes[episodeIndex] || '';

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentEpisodeUrl) {
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported() && currentEpisodeUrl.includes('.m3u8')) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(currentEpisodeUrl);
      hls.attachMedia(video);
    } else {
      video.src = currentEpisodeUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      video.removeAttribute('src');
      video.load();
    };
  }, [currentEpisodeUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || resumeTime <= 0) {
      return;
    }

    const handleLoadedMetadata = () => {
      if (Number.isFinite(video.duration) && resumeTime < video.duration) {
        video.currentTime = resumeTime;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentEpisodeUrl, resumeTime]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      void persistPlayRecord();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void persistPlayRecord();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [persistPlayRecord]);

  const backdropImage = useMemo(() => {
    if (!detail) {
      return '';
    }

    return processImageUrl(detail.backdrop || detail.poster || '');
  }, [detail]);

  const currentEpisodeLabel = t('currentEpisodeLabel').replace(
    '{count}',
    String(episodeIndex + 1)
  );

  return (
    <AppShell showBackButton>
      {loading ? (
        <div className='flex min-h-[50vh] items-center justify-center'>
          <div className='h-10 w-10 animate-spin rounded-full border-2 border-[#d4af37] border-t-transparent' />
        </div>
      ) : error ? (
        <div className='rounded-[2rem] border border-red-500/20 bg-red-500/10 px-5 py-12 text-center text-red-200'>
          {error}
        </div>
      ) : detail ? (
        <div className='space-y-8'>
          <section className='grid gap-6 lg:grid-cols-[1.4fr_0.9fr]'>
            <div className='overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f0f0f] shadow-[0_32px_64px_rgba(0,0,0,0.34)]'>
              <div className='relative aspect-video bg-black'>
                {backdropImage ? (
                  <img
                    src={backdropImage}
                    alt={detail.title}
                    className='absolute inset-0 h-full w-full object-cover opacity-20'
                  />
                ) : null}

                <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.72))]' />

                {currentEpisodeUrl ? (
                  <video
                    ref={videoRef}
                    controls
                    playsInline
                    className='absolute inset-0 h-full w-full bg-black'
                    onPause={() => {
                      void persistPlayRecord();
                    }}
                  />
                ) : (
                  <div className='absolute inset-0 flex items-center justify-center text-sm text-neutral-300'>
                    {t('noAvailableSource')}
                  </div>
                )}
              </div>
            </div>

            <div className='rounded-[2rem] border border-white/10 bg-[#111111]/72 p-6 shadow-[0_28px_56px_rgba(0,0,0,0.28)] backdrop-blur-xl'>
              <div className='space-y-4'>
                <span className='inline-flex rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-[#f0b90b]'>
                  {t('playing')}
                </span>

                <div>
                  <h1 className='text-3xl font-black text-white'>
                    {detail.title}
                  </h1>
                  <p className='mt-2 text-sm text-neutral-400'>
                    {currentEpisodeLabel}
                  </p>
                </div>

                <div className='flex flex-wrap gap-2'>
                  <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-neutral-200'>
                    {detail.year}
                  </span>
                  <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-neutral-200'>
                    {detail.source_name}
                  </span>
                  {detail.type_name ? (
                    <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-neutral-200'>
                      {detail.type_name}
                    </span>
                  ) : null}
                  {detail.class ? (
                    <span className='rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-neutral-200'>
                      {detail.class}
                    </span>
                  ) : null}
                </div>

                {detail.desc ? (
                  <p className='text-sm text-neutral-300'>{detail.desc}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className='rounded-[2rem] border border-white/10 bg-[#111111]/72 p-6 shadow-[0_28px_56px_rgba(0,0,0,0.28)] backdrop-blur-xl'>
            <div className='mb-5 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-white'>
                {t('selectEpisode')}
              </h2>
              <span className='text-sm text-neutral-400'>
                {detail.episodes.length} {t('episode')}
              </span>
            </div>

            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6'>
              {detail.episodes.map((_, index) => {
                const label = t('currentEpisodeLabel').replace(
                  '{count}',
                  String(index + 1)
                );

                return (
                  <button
                    key={`${detail.id}-${index}`}
                    type='button'
                    onClick={() => {
                      void persistPlayRecord();
                      setEpisodeIndex(index);
                      setResumeTime(0);
                    }}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                      index === episodeIndex
                        ? 'border-[#d4af37]/45 bg-[#d4af37]/12 text-[#f0b90b]'
                        : 'border-white/10 bg-white/5 text-neutral-200 hover:border-white/20 hover:bg-white/8'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
