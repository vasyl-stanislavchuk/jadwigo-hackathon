/**
 * A link inside the app: a real <a href> (so a middle-click, a new tab or a copied link work),
 * moved client-side on a plain click so the page's state and the query stay (location.ts). Moved
 * out of the playground's shell in dl-uukj.32 wave 2 step 0.
 */

import { type AnchorHTMLAttributes, forwardRef, type MouseEvent } from "react";
import { navigate } from "./location.ts";

export const NavLink = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; onNavigate?: () => void }
>(function NavLink({ href, onClick, onNavigate, ...props }, ref) {
  const click = (event: MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    navigate(href);
    onNavigate?.();
  };
  return <a ref={ref} href={href} onClick={click} {...props} />;
});
