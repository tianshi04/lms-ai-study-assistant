"use client";

import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { cn } from "@/lib/utils";

export function FieldLabel({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseField.Label>) {
  return (
    <BaseField.Label
      ref={ref}
      className={cn("block text-xs font-semibold text-foreground select-none mb-1", className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseField.Error>) {
  return (
    <BaseField.Error
      ref={ref}
      className={cn("text-xs text-destructive font-medium mt-1", className)}
      {...props}
    />
  );
}

export function FieldDescription({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof BaseField.Description>) {
  return (
    <BaseField.Description
      ref={ref}
      className={cn("text-xs text-muted-foreground mt-1", className)}
      {...props}
    />
  );
}

export const FieldRoot = BaseField.Root;

export const Field = Object.assign(BaseField.Root, {
  Root: BaseField.Root,
  Control: BaseField.Control,
  Label: FieldLabel,
  Error: FieldError,
  Description: FieldDescription,
});
