import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { processImageUrl } from '@/lib/utils';

import { ImagePlaceholder } from './ImagePlaceholder';
import { useLanguage } from './LanguageProvider';

interface VideoCardProps {
  id?: string;
  title: string;
  poster: string;
  year?: string;
  source?: string;
  source_name?: string;
  rate?: string;
  episodes?: number;
  currentEpisode?: number;
  progress?: number;
  query?: string;
  href?: string;
  onDelete?: () => void;
  type?: string;
  from?: string;
}

function clampProgress(progress?: number) {
  if (typeof progress !== 'number' || Number.isNaN(progress)) {
    return 0;
  }

  return Math.max(0, Math.min(100, progress));
}

export default function VideoCard({
  id,
  title,
  poster,
  year,
  source,
  source_name,
  rate,
  episodes,
  currentEpisode,
  progress,
  query,
  href,
  onDelete,
  type,
}: VideoCardProps) {
  const { t } = useLanguage();
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(!poster);

  const cardHref = useMemo(() => {
    if (href) {
      return href;
    }

    if (source && id) {
      const searchParams = new URLSearchParams({ source, id });
      if (query) {
        searchParams.set('title', query);
      }

      return `/play?${searchParams.toString()}`;
    }

    return `/search?q=${encodeURIComponent(query || title)}`;
  }, [href, id, query, source, title]);

  const imageUrl = imageFailed ? '' : processImageUrl(poster);
  const safeProgress = clampProgress(progress);
  const typeLabel =
    type === 'tv' ? t('tv') : type === 'movie' ? t('movie') : '';
  const episodeLabel = currentEpisode
    ? t('currentEpisodeLabel').replace('{count}', String(currentEpisode))
    : episodes
    ? `${episodes} ${t('episode')}`
    : '';
  const metaLabel = [year, source_name].filter(Boolean).join(' / ');

  return (
    <div className='group relative'>
      {onDelete ? (
        <button
          type='button'
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className='absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-black/60 text-neutral-200 opacity-0 transition-all hover:border-[#d4af37]/40 hover:text-[#f0b90b] group-hover:opacity-100'
          title={t('confirmDelete')}
          aria-label={t('confirmDelete')}
        >
          <X className='h-4 w-4' />
        </button>
      ) : null}

      <Link to={cardHref} className='block'>
        <div className='relative aspect-[2/3] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#171717] shadow-[0_20px_44px_rgba(0,0,0,0.38)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_26px_50px_rgba(0,0,0,0.42)]'>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className={`absolute inset-0 h-full w-full object-cover transition duration-500 ${
                imageReady ? 'opacity-100' : 'opacity-0'
              }`}
              loading='lazy'
              onLoad={() => setImageReady(true)}
              onError={() => {
                setImageFailed(true);
                setImageReady(false);
              }}
            />
          ) : null}

          {!imageReady || imageFailed ? (
            <div className='absolute inset-0'>
              <ImagePlaceholder aspectRatio='h-full' />
            </div>
          ) : null}

          <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,4,0.1)_0%,rgba(4,4,4,0.22)_35%,rgba(4,4,4,0.9)_100%)]' />

          <div className='absolute inset-x-3 top-3 flex items-start justify-between gap-2'>
            <div className='flex flex-wrap gap-2'>
              {typeLabel ? (
                <span className='rounded-full border border-white/12 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm'>
                  {typeLabel}
                </span>
              ) : null}

              {source_name ? (
                <span className='rounded-full border border-white/12 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm'>
                  {source_name}
                </span>
              ) : null}
            </div>

            {rate ? (
              <span className='rounded-full bg-[#f0b90b] px-2.5 py-1 text-[11px] font-semibold text-black shadow-[0_8px_20px_rgba(240,185,11,0.28)]'>
                {rate}
              </span>
            ) : null}
          </div>

          {safeProgress > 0 ? (
            <div className='absolute inset-x-0 bottom-0 h-1.5 bg-white/10'>
              <div
                className='h-full bg-[#f0b90b] shadow-[0_0_24px_rgba(240,185,11,0.45)]'
                style={{ width: `${safeProgress}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className='mt-3 space-y-1'>
          <h3 className='line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-[#f0b90b] sm:text-base'>
            {title}
          </h3>

          {metaLabel || episodeLabel ? (
            <div className='flex items-center justify-between gap-2 text-xs text-neutral-400 sm:text-sm'>
              <span className='truncate'>{metaLabel}</span>
              {episodeLabel ? (
                <span className='shrink-0 text-[#d4af37]'>{episodeLabel}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
