import * as React from "react";
import { cn } from "@/lib/utils";

function FieldSet({ className, ...props }: React.FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  return <fieldset className={cn("space-y-2", className)} {...props} />;
}

function FieldLegend({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLLegendElement> & { variant?: "label" }) {
  return (
    <legend
      className={cn(
        variant === "label"
          ? "text-xs uppercase tracking-wider text-foreground-muted"
          : "text-sm font-medium",
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-foreground-muted", className)} {...props} />;
}

function FieldGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

function Field({
  orientation = "vertical",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      className={cn(
        "group/field flex",
        orientation === "horizontal" ? "flex-row items-center gap-3" : "flex-col gap-1",
        className,
      )}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm text-foreground", className)} {...props} />;
}

export { FieldSet, FieldLegend, FieldDescription, FieldGroup, Field, FieldLabel };
