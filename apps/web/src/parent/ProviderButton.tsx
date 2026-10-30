/**
 * A provider's sign-in button on /parent, dressed as its brand rules ask (dl-e8ov.2.72).
 *
 * Google (developers.google.com/identity/branding-guidelines): the standard colour "super G" on
 * white, its size and colour unchanged, before the text; the light theme's fill, 1 px stroke and
 * text colours. google-g.svg is the G cut from Google's own pre-approved asset (signin-assets.zip,
 * "Theme=Light, Show text=No, Shape=Square, Platform=Android+Web.svg"): the button's frame removed
 * and the viewBox narrowed to the G's 20 x 20, nothing in the G itself changed. It stays an <img>
 * of that file, since the G is a gradient Figma drew inside a foreignObject that JSX would have to
 * redraw. Its words are in the rules' font, Google Sans Medium at 14/20 (OFL 1.1, from
 * @fontsource/google-sans): the @font-face is global, but only this button names the family, so no
 * other text changes, and the browser fetches only the subsets the button's words use.
 *
 * Facebook (developers.facebook.com/docs/facebook-login/userexperience, Meta's brand resources):
 * the approved "f", unmodified, before the label, at least 16 wide. facebook-f.svg is the Primary
 * Logo from Meta's Facebook Brand Asset Pack (Facebook_Logo_Primary.ai), turned into SVG by
 * pdftocairo with its paths and colours as they were, the artboard trimmed to the mark. The button
 * keeps the house outline, which is the paper the blue circle sits on.
 *
 * Google's colours are not Zeszyt roles, so they are written here once (parent/tokens.allow.json
 * says why).
 */

import "@fontsource/google-sans/500.css";
import { Button } from "@jadwigo/ui";
import type { CSSProperties, ReactElement } from "react";
import type { Provider } from "./auth.ts";
import facebookF from "./facebook-f.svg";
import googleG from "./google-g.svg";

/** Google's light theme: fill, stroke and text, in Google Sans Medium 14/20. */
const GOOGLE_LIGHT: CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderColor: "#747775",
  color: "#1F1F1F",
  fontFamily: "'Google Sans', sans-serif",
  fontWeight: 500,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
};

const MARK: Record<Provider, { src: string; look?: CSSProperties }> = {
  google: { src: googleG, look: GOOGLE_LIGHT },
  facebook: { src: facebookF },
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
      style={mark.look}
      disabled={disabled}
      onClick={onClick}
      data-provider={provider}
    >
      <img
        src={mark.src}
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0"
        data-provider-mark={provider}
      />
      {label}
    </Button>
  );
}
