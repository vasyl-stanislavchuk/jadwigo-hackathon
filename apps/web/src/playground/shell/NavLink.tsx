/**
 * A playground link: a real <a href> (so a middle-click, a new tab or a copied link work), moved
 * client-side on a plain click so the controls and the query keep their state.
 */

import { type AnchorHTMLAttributes, forwardRef, type MouseEvent } from "react";
import { navigate } from "../route.ts";

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
