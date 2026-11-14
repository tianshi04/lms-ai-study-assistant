"use client";

import { Button } from "@/components/ui/Button";

interface PagedQueryStatusProps {
  isError: boolean;
  /** Message shown before the error detail, e.g. "Không thể tải danh sách khóa học". */
  errorLabel: string;
  errorMessage?: string;
  onRetry: () => void;
  /** True when the requested page no longer exists (rows were removed while it was open). */
  isPastLastPage: boolean;
  onGoToFirstPage: () => void;
}

/** Error and "page no longer exists" states shared by the paged admin tables. */
export function PagedQueryStatus({
  isError,
  errorLabel,
  errorMessage,
  onRetry,
  isPastLastPage,
  onGoToFirstPage,
}: PagedQueryStatusProps) {
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
