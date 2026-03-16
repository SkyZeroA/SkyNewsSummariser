/**
 * Skeleton loader components for improved loading UX
 * Provides skeleton screens for article cards and summary sections
 */

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton = ({ className = "" }: SkeletonProps) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    aria-hidden="true"
  />
);

/**
 * Skeleton for article card
 */
export const ArticleCardSkeleton = () => (
  <div className="overflow-hidden rounded-lg shadow-lg bg-white dark:bg-gray-800 animate-fadeIn">
    <div className="relative w-full h-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

/**
 * Skeleton for summary section
 */
export const SummarySkeleton = () => (
  <div className="space-y-4 animate-fadeIn">
    <Skeleton className="h-6 w-48" />
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <Skeleton className="h-4 w-32 mb-2" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton for source article list item (admin page)
 */
export const SourceArticleSkeleton = () => (
  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg animate-fadeIn">
    <Skeleton className="h-5 w-3/4 mb-2" />
    <Skeleton className="h-4 w-32" />
  </div>
);

/**
 * Grid of article card skeletons
 */
export const ArticleGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <ArticleCardSkeleton key={index} />
    ))}
  </div>
);

/**
 * List of source article skeletons (admin page)
 */
export const SourceArticleListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, index) => (
      <SourceArticleSkeleton key={index} />
    ))}
  </div>
);

