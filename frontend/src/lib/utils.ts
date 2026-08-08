import * as React from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type BaseUIRenderProp =
  | React.ReactElement
  | ((props: Record<string, any>, state: any) => React.ReactElement)
  | undefined;

export function renderPolymorphicElement<P extends Record<string, any>>(
  render: BaseUIRenderProp,
  defaultProps: P,
  defaultTag: React.ElementType = "div",
): React.ReactElement {
  if (!render) {
    return React.createElement(defaultTag, defaultProps);
  }

  if (React.isValidElement(render)) {
    const element = render as React.ReactElement<any>;
    return React.cloneElement(element, {
      ...defaultProps,
      ...element.props,
      className: cn(defaultProps.className, element.props.className),
      children: defaultProps.children ?? element.props.children,
    });
  }

  if (typeof render === "function") {
    return render(defaultProps, {});
  }

  return React.createElement(defaultTag, defaultProps);
}
