/**
 * The loading cast (dl-7wlo.44) on the System page: Ołówek, Gumka and Linijka, each as a page waits
 * (the large drawing) and as a block waits (the small one), on the day paper and on the night one,
 * then the plain spinner a page or a block shows without a character. Each sits in a box drawn
 * around the room `Loading` holds, so its centring shows. The drawings wait 300 ms as they do in the
 * app; the reduced-motion setting turns every one to its still file. apps/web/e2e/loading.spec.ts
 * measures them at phone and desktop widths.
 */
import { copy } from "@jadwigo/copy";
import { Loading, type LoadingCharacter, type LoadingSize } from "@jadwigo/ui";
import { useSystemLanguage } from "./lang.ts";

const CAST: readonly { character: LoadingCharacter; name: string }[] = [
  { character: "olowek", name: "Ołówek" },
  { character: "gumka", name: "Gumka" },
  { character: "linijka", name: "Linijka" },
];

const SIZES: readonly { size: LoadingSize; name: string }[] = [
  { size: "page", name: "page (large, 200 to 320 px)" },
  { size: "block", name: "block (small, 112 px)" },
];

function Surface({ dark }: { dark: boolean }): JSX.Element {
  const LANG = useSystemLanguage();
  const label = copy(LANG, "loading");
  // [theme="dark"] turns on the night roles wherever it is set (foundation.css).
  const night = dark ? { theme: "dark" } : {};
  return (
    <div
      {...night}
      data-loading-surface={dark ? "dark" : "light"}
      className="flex flex-col gap-4 rounded-jw-card border border-border bg-background p-4 text-foreground"
    >
      <p className="text-jw-page-small text-muted-foreground">{dark ? "Night" : "Day"}</p>
      {SIZES.map(({ size, name }) => (
        <div key={size} className="flex flex-col gap-2">
          <p className="text-jw-page-small text-muted-foreground">{name}</p>
          <div className="grid gap-3 md:grid-cols-3">
            {CAST.map(({ character, name: who }) => (
              <figure key={character} className="flex flex-col gap-1">
                <div
                  className="rounded-jw-small border border-dashed border-border"
                  data-loading-demo={`${character}-${size}`}
                >
                  <Loading label={label} size={size} character={character} />
                </div>
                <figcaption className="text-jw-page-small text-muted-foreground">{who}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingKit(): JSX.Element {
  const LANG = useSystemLanguage();
  const label = copy(LANG, "loading");
  return (
    <div className="flex flex-col gap-6" data-loading-kit>
      <Surface dark={false} />
      <Surface dark />
      <div className="grid gap-3 md:grid-cols-2">
        {SIZES.map(({ size, name }) => (
          <figure key={size} className="flex flex-col gap-1">
            <div
              className="rounded-jw-small border border-dashed border-border"
              data-loading-demo={`spinner-${size}`}
            >
              <Loading label={label} size={size} />
            </div>
            <figcaption className="text-jw-page-small text-muted-foreground">
              No character: the spinner, {name.split(" ")[0]}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
