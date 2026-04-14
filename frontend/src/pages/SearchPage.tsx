import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { ApiSite, SearchResult } from '@shared/api-contract';

import AppShell from '@/components/AppShell';
import { useLanguage } from '@/components/LanguageProvider';
import VideoCard from '@/components/VideoCard';
import { apiClient } from '@/lib/api-client';
import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';

export default function SearchPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() || '';

  const [searchValue, setSearchValue] = useState(query);
  const [resources, setResources] = useState<ApiSite[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getSearchHistory(),
      apiClient.getSearchResources().catch(() => [] as ApiSite[]),
    ]).then(([history, nextResources]) => {
      if (cancelled) {
        return;
      }

      setSearchHistory(history);
      setResources(nextResources);
    });

    const unsubscribe = subscribeToDataUpdates<string[]>(
      'searchHistoryUpdated',
      (history) => {
        if (!cancelled) {
          setSearchHistory(history);
        }
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      setError('');
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    apiClient
      .search({ q: query })
      .then((response) => {
        if (cancelled) {
          return;
        }

        setResults(response.results);
        void addSearchHistory(query);
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error ? nextError.message : t('searchFailed')
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
  }, [query, t]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = searchValue.trim();
    if (!trimmed) {
      return;
    }

    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <AppShell>
      <section className='rounded-[2rem] border border-white/10 bg-[#101010]/75 p-6 shadow-[0_28px_56px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8'>
        <form
          onSubmit={handleSubmit}
          className='flex flex-col gap-3 sm:flex-row'
        >
          <input
            type='search'
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className='h-12 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-[#d4af37]/45 focus:bg-black/45'
          />
          <button
            type='submit'
            className='h-12 rounded-2xl bg-[#f0b90b] px-6 text-sm font-semibold text-black'
          >
            {t('search')}
          </button>
        </form>

        {resources.length > 0 ? (
          <div className='mt-5'>
            <div className='mb-3 text-sm font-medium text-neutral-400'>
              {t('source')}
            </div>
            <div className='flex flex-wrap gap-2'>
              {resources.map((resource) => (
                <span
                  key={resource.key}
                  className='rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-neutral-200'
                >
                  {resource.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className='mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
          {error}
        </div>
      ) : null}

      {query ? (
        <section className='mt-10'>
          <div className='mb-5 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-white sm:text-2xl'>
              {t('searchResults')}
            </h2>
          </div>

          {loading ? (
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'>
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index}>
                  <div className='aspect-[2/3] animate-pulse rounded-[1.25rem] bg-white/8' />
                  <div className='mt-3 h-4 animate-pulse rounded bg-white/8' />
                  <div className='mt-2 h-3 w-2/3 animate-pulse rounded bg-white/8' />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'>
              {results.map((item) => (
                <VideoCard
                  key={`${item.source}-${item.id}`}
                  id={item.id}
                  title={item.title}
                  poster={item.poster}
                  year={item.year}
                  source={item.source}
                  source_name={item.source_name}
                  episodes={item.episodes.length}
                  query={query !== item.title ? query : ''}
                  type={item.episodes.length > 1 ? 'tv' : 'movie'}
                />
              ))}
            </div>
          ) : (
            <div className='rounded-[1.75rem] border border-white/10 bg-[#111111]/60 px-5 py-8 text-center text-neutral-400'>
              {t('noResults')}
            </div>
          )}
        </section>
      ) : (
        <section className='mt-10'>
          <div className='mb-5 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-white sm:text-2xl'>
              {t('searchHistory')}
            </h2>

            {searchHistory.length > 0 ? (
              <button
                type='button'
                onClick={() => {
                  void clearSearchHistory();
                }}
                className='text-sm text-neutral-400 transition-colors hover:text-[#f0b90b]'
              >
                {t('clearHistory')}
              </button>
            ) : null}
          </div>

          {searchHistory.length > 0 ? (
            <div className='flex flex-wrap gap-3'>
              {searchHistory.map((item) => (
                <div
                  key={item}
                  className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2'
                >
                  <button
                    type='button'
                    onClick={() =>
                      navigate(`/search?q=${encodeURIComponent(item)}`)
                    }
                    className='text-sm text-neutral-100'
                  >
                    {item}
                  </button>

                  <button
                    type='button'
                    onClick={() => {
                      void deleteSearchHistory(item);
                    }}
                    className='text-neutral-500 transition-colors hover:text-[#f0b90b]'
                    title={t('deleteSearchHistory')}
                    aria-label={t('deleteSearchHistory')}
                  >
                    <X className='h-4 w-4' />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className='rounded-[1.75rem] border border-white/10 bg-[#111111]/60 px-5 py-8 text-center text-neutral-400'>
              {t('noSearchHistory')}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
