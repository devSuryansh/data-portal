import { getGQLFilter } from '../../GuppyComponents/Utils/queries';
import {
  buildDensityHeatmapCacheKey,
  groupFieldPathsByCategory,
} from '../../GuppyDataExplorer/ExplorerDensityHeatmap/utils';
import { fetchCategoryDensity } from './densityHeatmapAPI';
import { createDensityHeatmapScheduler } from './densityHeatmapScheduler';
import {
  densityHeatmapCategoryFailed,
  densityHeatmapCategoryLoaded,
  densityHeatmapCategoryLoading,
  densityHeatmapJobFinished,
  densityHeatmapJobStarted,
  resetDensityHeatmapResult,
} from './slice';

const CONCURRENCY = 2;
export const MAX_CATEGORY_FETCH_ATTEMPTS = 3;

/**
 * Retry a category fetch up to MAX_CATEGORY_FETCH_ATTEMPTS times.
 * AbortError is not retried.
 *
 * @template T
 * @param {() => Promise<T>} fetchOnce
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<T>}
 */
export async function fetchCategoryDensityWithRetry(fetchOnce, { signal } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_CATEGORY_FETCH_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
    try {
      return await fetchOnce();
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      lastError = err;
    }
  }
  throw lastError;
}

let jobGeneration = 0;
/** @type {AbortController | null} */
let jobAbortController = null;
/** @type {ReturnType<typeof createDensityHeatmapScheduler> | null} */
let activeScheduler = null;

function cancelActiveJob() {
  jobGeneration += 1;
  if (jobAbortController) jobAbortController.abort();
  jobAbortController = null;
  activeScheduler?.cancel();
  activeScheduler = null;
}

/**
 * Prefer loading a category next (e.g. when its section scrolls into view).
 * @param {string} categoryKey
 */
export function prioritizeDensityHeatmapCategory(categoryKey) {
  activeScheduler?.prioritize(categoryKey);
}

/**
 * Progressive, cancellable density load: one category at a time, concurrency 2.
 * Survives leaving the heatmap view because work is owned by Redux + this module.
 *
 * @param {{
 *  dataType: string;
 *  fieldPaths: string[];
 *  filter: object;
 *  totalCount: number;
 * }} args
 */
export function loadDensityHeatmap(args) {
  return async (dispatch, getState) => {
    const { dataType, fieldPaths = [], filter = {}, totalCount = 0 } = args;

    if (!dataType || fieldPaths.length === 0) {
      cancelActiveJob();
      dispatch(resetDensityHeatmapResult());
      return;
    }

    const gqlFilter = getGQLFilter(filter) ?? {};
    const cacheKey = buildDensityHeatmapCacheKey({
      dataType,
      fieldPaths,
      gqlFilter,
      totalCount,
    });
    const categories = groupFieldPathsByCategory(fieldPaths);
    const current = getState().explorer.densityHeatmapResult;

    if (current.cacheKey === cacheKey) {
      if (current.isPending) return;
      if (
        current.totalCategories > 0 &&
        current.loadedCount >= current.totalCategories
      ) {
        return;
      }
    }

    jobGeneration += 1;
    const myGeneration = jobGeneration;
    if (jobAbortController) jobAbortController.abort();
    jobAbortController = new AbortController();
    const { signal } = jobAbortController;
    activeScheduler?.cancel();

    const resumeSameJob = current.cacheKey === cacheKey;
    const alreadyLoaded = new Set(
      resumeSameJob ? current.loadedCategoryKeys : [],
    );

    dispatch(
      densityHeatmapJobStarted({
        cacheKey,
        categoryKeys: categories.map((category) => category.key),
        keepRows: resumeSameJob,
      }),
    );

    /** @type {{ key: string, fields: string[] }[]} */
    const queue = categories.filter(
      (category) => !alreadyLoaded.has(category.key),
    );

    /**
     * @param {{ key: string, fields: string[] }} category
     */
    async function fetchOne(category) {
      if (myGeneration !== jobGeneration) return;

      dispatch(
        densityHeatmapCategoryLoading({
          cacheKey,
          categoryKey: category.key,
        }),
      );

      try {
        const rows = await fetchCategoryDensityWithRetry(
          () =>
            fetchCategoryDensity({
              dataType,
              fieldPaths: category.fields,
              gqlFilter,
              totalCount,
              signal,
            }),
          { signal },
        );
        if (myGeneration !== jobGeneration) return;
        dispatch(
          densityHeatmapCategoryLoaded({
            cacheKey,
            categoryKey: category.key,
            rows,
          }),
        );
      } catch (err) {
        if (err?.name === 'AbortError') return;
        if (myGeneration !== jobGeneration) return;
        // eslint-disable-next-line no-console
        console.error(err);
        dispatch(
          densityHeatmapCategoryFailed({
            cacheKey,
            categoryKey: category.key,
            error: 'Unable to load density data from the GraphQL API.',
          }),
        );
      }
    }

    const scheduler = createDensityHeatmapScheduler({
      concurrency: CONCURRENCY,
      fetchCategory: fetchOne,
    });
    activeScheduler = scheduler;
    await scheduler.run(queue);

    if (myGeneration === jobGeneration) {
      dispatch(densityHeatmapJobFinished({ cacheKey }));
      jobAbortController = null;
      if (activeScheduler === scheduler) activeScheduler = null;
    }
  };
}
