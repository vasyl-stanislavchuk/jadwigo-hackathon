/**
 * A provider's sign-in button on /parent, dressed as its brand rules ask (dl-e8ov.2.72).
 *
 * Google (developers.google.com/identity/branding-guidelines): the standard colour "super G" on
 * white, its size and colour unchanged, before the text; the light theme's fill, 1 px stroke and
 * text colours. google-g.svg is the G cut from Google's own pre-approved asset (signin-assets.zip,
 * "Theme=Light, Show text=No, Shape=Square, Platform=Android+Web.svg"): the button's frame removed
 * and the viewBox narrowed to the G's 20 x 20, nothing in the G itself changed. It stays an <img>
 * of that file, since the G is a gradient Figma drew inside a foreignObject that JSX would have to
 * redraw. The rules' font, Google Sans, is not ours; the button keeps the page's.
 *
 * The colours are the providers', not Zeszyt roles, so they are written here once
 * (parent/tokens.allow.json says why). Facebook keeps the house outline button until Meta's
 * approved "f" is in hand.
 */

import { Button } from "@jadwigo/ui";
import type { CSSProperties, ReactElement } from "react";
import type { Provider } from "./auth.ts";
import googleG from "./google-g.svg";

/** Google's light theme: fill, stroke and text. */
const GOOGLE_LIGHT: CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderColor: "#747775",
  color: "#1F1F1F",
};

const MARK: Partial<Record<Provider, { src: string; look: CSSProperties }>> = {
  google: { src: googleG, look: GOOGLE_LIGHT },
};

export function ProviderButton({
  provider,
  label,
  disabled,
  onClick,
}: {
  provider: Provider;
  label: string;
  disabled: boolean;
  onClick: () => void;
}): ReactElement {
  const mark = MARK[provider];
  return (
    <Button
      type="button"
      variant="outline"
      size="control"
      className="gap-2.5"
      style={mark?.look}
      disabled={disabled}
      onClick={onClick}
      data-provider={provider}
    >
      {mark && (
        <img
          src={mark.src}
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0"
          data-provider-mark={provider}
        />
      )}
      {label}
    </Button>
  );
}
