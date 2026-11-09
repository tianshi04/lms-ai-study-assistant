"use client";

import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";

interface PagedQueryStatusProps {
  isLoading: boolean;
  loadingLabel: string;
  isError: boolean;
  /** Message shown before the error detail, e.g. "Không thể tải danh sách khóa học". */
  errorLabel: string;
  errorMessage?: string;
  onRetry: () => void;
  /** True when the requested page no longer exists (rows were removed while it was open). */
  isPastLastPage: boolean;
  onGoToFirstPage: () => void;
}

/** Loading, error and "page no longer exists" states shared by the paged admin tables. */
export function PagedQueryStatus({
  isLoading,
  loadingLabel,
  isError,
  errorLabel,
  errorMessage,
  onRetry,
  isPastLastPage,
  onGoToFirstPage,
}: PagedQueryStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Progress.Circular size="md" className="mr-3" />
        <span aria-live="polite" className="text-sm font-medium">
          {loadingLabel}
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-destructive">
          {errorLabel}
          {errorMessage ? `: ${errorMessage}` : ""}
        </p>
        <Button variant="outlined" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (isPastLastPage) {
    return (
      <div className="py-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">Trang này không còn mục nào.</p>
        <Button variant="outlined" size="sm" onClick={onGoToFirstPage}>
          Về trang đầu
        </Button>
      </div>
    );
  }

  return null;
}
