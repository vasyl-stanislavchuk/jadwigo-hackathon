// Writes the identity drop's mocks and tables from data/identity.json:
// diagrams/*.html (one page per surface), data/contrast.json, voice.md,
// and the contrast table inside look.md. Run: bun docs/drops/identity/build.ts
// Then render the PNGs with shots.sh.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dir;

type Palette = Record<string, string>;
type Look = {
  id: string;
  name: string;
  label: string;
  leans: string;
  display: string;
  displayLicence: string;
  idea: string;
  mark: "rule" | "crown" | "steps";
  day: Palette;
  night: Palette;
};
type Voice = {
  id: string;
  name: string;
  en: string;
  leans: string;
  how: string;
  lines: Record<string, string>;
};
type Story = {
  id: string;
  name: string;
  en: string;
  story: string;
  character: "lantern" | "crown" | "steps";
  characterName: string;
  characterIdea: string;
};
type Data = {
  leads: Record<string, { name: string; parent: string; child: string }>;
  looks: Look[];
  pairs: [string, string, "text" | "mark"][];
  voices: Voice[];
  lineNames: Record<string, string>;
  lineNamesEn: Record<string, string>;
  stories: Story[];
  founder: string;
  hackathon: string;
};

const data = JSON.parse(readFileSync(join(here, "data/identity.json"), "utf8")) as Data;

// WCAG 2 relative luminance and contrast ratio.
function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 10) / 10;
}

const contrastRows: { look: string; pair: string; kind: string; day: number; night: number }[] = [];
for (const look of data.looks) {
  for (const [fg, bg, kind] of data.pairs) {
    const dfg = look.day[fg];
    const dbg = look.day[bg];
    const nfg = look.night[fg];
    const nbg = look.night[bg];
    if (!dfg || !dbg || !nfg || !nbg) continue;
    contrastRows.push({
      look: look.name,
      pair: `${fg} on ${bg}`,
      kind,
      day: contrast(dfg, dbg),
      night: contrast(nfg, nbg),
    });
  }
}
writeFileSync(join(here, "data/contrast.json"), `${JSON.stringify(contrastRows, null, 2)}\n`);

// The fonts ship in fonts/, so every mock renders offline with the faces it names.
const fontFaces = (["andika", "fraunces", "baloo-2"] as const)
  .flatMap((file) => {
    const family = { andika: "Andika", fraunces: "Fraunces", "baloo-2": "Baloo 2" }[file];
    return ([400, 700] as const).flatMap((w) =>
      (["latin", "latin-ext"] as const).map(
        (sub) =>
          `@font-face{font-family:"${family}";font-weight:${w};font-display:block;src:url(../fonts/${file}-${sub}-${w}-normal.woff2) format("woff2");}`,
      ),
    );
  })
  .join("\n");

// One footprint, toes up, in a 20x32 box centred on (0,0); flip draws the other foot.
const footprint = (x: number, y: number, r: number, flip: boolean, fill: string) =>
  `<g transform="translate(${x} ${y}) rotate(${r}) scale(${flip ? -1 : 1} 1)"><path d="M-1 -6c4-1 7 2 6.5 7-.4 4-2 6-2.2 9-.2 2.6.6 4.4-1.6 5.8-2.6 1.6-5.4-.4-5.4-3.4 0-3 1.4-4.6 1.2-8.4-.2-3.4-1.6-9.2 1.5-10z" fill="${fill}"/><circle cx="-4.6" cy="-9.4" r="2.3" fill="${fill}"/><circle cx="-0.8" cy="-11.6" r="2" fill="${fill}"/><circle cx="2.6" cy="-11" r="1.8" fill="${fill}"/><circle cx="5.4" cy="-9.2" r="1.6" fill="${fill}"/><circle cx="7.4" cy="-6.4" r="1.4" fill="${fill}"/></g>`;

// n footprints across width; the first `done` in fill, the rest in rest (the step bar's later steps).
function trail(n: number, fill: string, width: number, done = n, rest = fill): string {
  const step = width / n;
  const feet = Array.from({ length: n }, (_, i) =>
    footprint(14 + i * step, i % 2 ? 14 : 30, 90, i % 2 === 1, i < done ? fill : rest),
  ).join("");
  return `<svg viewBox="0 0 ${width} 44" width="${width}" height="44" aria-hidden="true">${feet}</svg>`;
}

function crown(gold: string, leaf: string, size: number): string {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><path d="M32 30c0-8 4-13 10-15-1 7-4 11-10 15z" fill="${leaf}"/><path d="M32 30c0-6-3-10-8-12 1 6 3 9 8 12z" fill="${leaf}"/><path d="M32 30v8" stroke="${leaf}" stroke-width="2.4" stroke-linecap="round"/><path d="M10 52l-2-18 11 8 6-12 7 10 7-10 6 12 11-8-2 18z" fill="${gold}"/><path d="M10 52h44v5H10z" fill="${gold}"/><circle cx="20" cy="47" r="2.2" fill="#fff"/><circle cx="32" cy="47" r="2.2" fill="#fff"/><circle cx="44" cy="47" r="2.2" fill="#fff"/></svg>`;
}

function lantern(body: string, glow: string, size: number): string {
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><path d="M32 4v6" stroke="${body}" stroke-width="2.4" stroke-linecap="round"/><path d="M24 10h16l-3 6H27z" fill="${body}"/><path d="M20 18h24c2 10 2 22 0 32H20c-2-10-2-22 0-32z" fill="${body}"/><path d="M32 22c5 6 5 18 0 24-5-6-5-18 0-24z" fill="${glow}"/><path d="M24 30l4 4-4 4M40 30l-4 4 4 4" stroke="${glow}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 50h20l-3 6H25z" fill="${body}"/></svg>`;
}

// The display face first, Andika behind it (Andika alone when it is the display face).
const face = (look: Look) =>
  look.display === "Andika" ? "Andika,sans-serif" : `'${look.display}',Andika,sans-serif`;

function wordmark(look: Look, size: number, p: Palette): string {
  const go = `<span style="color:${p.accent}">go</span>`;
  const text = `<span class="wm" style="font-family:${face(look)};font-weight:700;font-size:${size}px;letter-spacing:${look.mark === "crown" ? "-0.01em" : "-0.02em"};color:${p.ink};line-height:1">jadwi${go}</span>`;
  if (look.mark === "rule") {
    return `<span class="lockup" style="display:inline-flex;flex-direction:column;gap:${Math.round(size * 0.08)}px">${text}<span style="display:block;height:${Math.max(2, Math.round(size * 0.05))}px;background:${p.accent};border-radius:2px;width:100%"></span></span>`;
  }
  if (look.mark === "crown") {
    return `<span class="lockup" style="display:inline-flex;align-items:flex-end;gap:${Math.round(size * 0.18)}px">${crown(p.gold ?? p.accent, p.accent, Math.round(size * 1.05))}${text}</span>`;
  }
  return `<span class="lockup" style="display:inline-flex;align-items:center;gap:${Math.round(size * 0.25)}px">${text}${trail(3, p.accent, Math.round(size * 1.6))}</span>`;
}

function page(title: string, body: string, w: number, h: number, bg: string): string {
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${w}">
<title>${title}</title>
<style>
${fontFaces}
*{box-sizing:border-box}
html,body{margin:0;width:${w}px;min-height:${h}px;background:${bg}}
body{font-family:Andika,sans-serif;-webkit-font-smoothing:antialiased;font-variant-numeric:lining-nums tabular-nums}
.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:16px;font-weight:700;border:0;cursor:default}
.chip{display:inline-block;border-radius:9999px;padding:6px 14px;font-size:15px;border:2px solid}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

function grid(p: Palette): string {
  return `background-color:${p.ground};background-image:linear-gradient(${p.grid} 1px,transparent 1px),linear-gradient(90deg,${p.grid} 1px,transparent 1px);background-size:24px 24px`;
}

function featuredCard(look: Look, p: Palette, width: number): string {
  const credit = "Zadania z Khan Academy i Alfika Matematycznego, zawsze z podanym źródłem.";
  return `<div style="width:${width}px;background:${p.card};border:2px solid ${p.line};border-radius:16px;padding:20px;color:${p.ink}">
<div style="font-size:15px;color:${p.inkSoft};margin-bottom:6px">Lekcja na start · klasy 1–3</div>
<div style="font-family:${face(look)};font-weight:700;font-size:26px;line-height:1.2;margin-bottom:12px">Liczby do 20</div>
<div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">${look.mark === "steps" ? trail(5, p.accent, 150) : `<span style="font-size:15px;color:${p.inkSoft}">9 krótkich zadań</span>`}</div>
<div style="font-size:15px;color:${p.inkSoft};line-height:1.35;margin-bottom:16px">${credit}</div>
<span class="btn" style="width:100%;height:56px;font-size:20px;background:${p.act};color:${p.onAct};box-shadow:0 4px 0 ${p.actEdge}">Zagraj</span>
</div>`;
}

function hero(look: Look, phone: boolean): string {
  const p = look.day;
  const lead = data.leads[look.leans];
  if (!lead) throw new Error(`no lead ${look.leans}`);
  const w = phone ? 390 : 1280;
  const h = phone ? 844 : 800;
  const pad = phone ? 16 : 64;
  const bg = look.mark === "crown" ? `background:${p.ground}` : grid(p);
  const nav = `<div style="display:flex;justify-content:space-between;align-items:center;padding:${phone ? 16 : 28}px ${pad}px">
${wordmark(look, phone ? 30 : 38, p)}
<div style="display:flex;gap:${phone ? 12 : 28}px;align-items:center;font-size:${phone ? 16 : 18}px;color:${p.ink}">${phone ? "" : "<span>Jak to działa</span>"}<span>O nas</span></div>
</div>`;
  const words = `<div style="max-width:${phone ? w - 2 * pad : 600}px">
<div style="font-family:${face(look)};font-weight:700;font-size:${phone ? 32 : 52}px;line-height:1.12;color:${p.ink};letter-spacing:-0.01em">${lead.parent}</div>
<div style="font-size:${phone ? 18 : 22}px;line-height:1.35;color:${p.inkSoft};margin-top:${phone ? 14 : 20}px">${lead.child}</div>
<div style="display:flex;gap:16px;align-items:center;margin-top:${phone ? 22 : 32}px;flex-wrap:wrap">
<span class="btn" style="height:64px;padding:0 28px;font-size:22px;background:${p.act};color:${p.onAct};box-shadow:0 4px 0 ${p.actEdge}">Zagraj w pierwszą lekcję</span>
</div>
<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
<span class="chip" style="border-color:${p.line};color:${p.ink};background:${p.card}">bezpłatnie</span>
<span class="chip" style="border-color:${p.line};color:${p.ink};background:${p.card}">bez reklam</span>
</div>
</div>`;
  const body = `<div style="${bg};width:${w}px;height:${h}px;overflow:hidden">
${nav}
<div style="display:flex;${phone ? "flex-direction:column;gap:28px" : "justify-content:space-between;align-items:center"};padding:${phone ? 12 : 56}px ${pad}px 0">
${words}
${featuredCard(look, p, phone ? w - 2 * pad : 380)}
</div>
</div>`;
  return page(`${look.name}: strona główna`, body, w, h, p.ground);
}

function lessonCard(look: Look): string {
  const p = look.day;
  const w = 720;
  const h = 640;
  // The lesson keeps Zeszyt as it is; only the step bar and the close corner carry the look.
  const z = {
    line: "#e8e2d5",
    ink: "#22252d",
    soft: "#50535c",
    pick: "#dce8fb",
    pickEdge: "#2f63b8",
    pickInk: "#163a78",
    act: "#9fbaeb",
    onAct: "#0f285a",
    actEdge: "#6585c2",
  };
  const steps =
    look.mark === "steps"
      ? trail(9, "#3a5fa8", 420, 3, z.line)
      : `<div style="display:flex;gap:6px">${Array.from(
          { length: 9 },
          (_, i) =>
            `<span style="width:36px;height:8px;border-radius:9999px;background:${i < 3 ? "#3a5fa8" : z.line}"></span>`,
        ).join("")}</div>`;
  const corner =
    look.mark === "crown"
      ? crown(p.gold ?? "#ad7f1f", p.accent, 30)
      : look.mark === "rule"
        ? `<span style="font-weight:700;font-size:18px;color:${z.soft}">jadwi<span style="color:#3a5fa8">go</span></span>`
        : "";
  const option = (n: string, picked: boolean) =>
    `<span style="display:flex;align-items:center;justify-content:center;height:72px;border-radius:16px;font-size:26px;border:2px solid ${picked ? z.pickEdge : z.line};background:${picked ? z.pick : "#fff"};color:${picked ? z.pickInk : z.ink};box-shadow:0 4px 0 ${picked ? z.pickEdge : z.line}">${n}</span>`;
  const body = `<div style="width:${w}px;height:${h}px;background:#fff;color:${z.ink};display:flex;flex-direction:column">
<div style="height:72px;display:flex;align-items:center;gap:20px;padding:0 24px;border-bottom:2px solid ${z.line}">
<span style="font-size:28px;color:${z.soft}">×</span>
<div style="flex:1;display:flex;justify-content:center">${steps}</div>
<span style="min-width:30px;display:flex;justify-content:flex-end">${corner}</span>
</div>
<div style="padding:24px 24px 0;flex:1">
<div style="font-weight:700;font-size:22px;margin-bottom:16px">Wybierz wynik.</div>
<div style="border:2px solid ${z.line};border-radius:16px;padding:20px;font-size:36px;display:flex;justify-content:space-between;align-items:center"><span>6 × 7 = ?</span><span style="font-size:15px;color:${z.soft};border:2px solid ${z.line};border-radius:9999px;padding:6px 12px">posłuchaj</span></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px">${option("42", true)}${option("48", false)}${option("36", false)}${option("13", false)}</div>
</div>
<div style="height:96px;border-top:2px solid ${z.line};display:flex;align-items:center;gap:12px;padding:0 24px">
<span class="btn" style="height:64px;padding:0 20px;font-size:20px;background:#fbf1d2;color:#5a4300;box-shadow:0 4px 0 #a07c14">Pomóż mi</span>
<span class="btn" style="flex:1;height:64px;font-size:22px;background:${z.act};color:${z.onAct};box-shadow:0 4px 0 ${z.actEdge}">Sprawdź</span>
</div>
</div>`;
  return page(`${look.name}: karta lekcji`, body, w, h, "#ffffff");
}

function ogCard(look: Look): string {
  const p = look.day;
  const lead = data.leads[look.leans];
  if (!lead) throw new Error(`no lead ${look.leans}`);
  const bg = look.mark === "crown" ? `background:${p.ground}` : grid(p);
  const body = `<div style="${bg};width:1200px;height:630px;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between">
${wordmark(look, 64, p)}
<div style="font-family:${face(look)};font-weight:700;font-size:48px;line-height:1.15;color:${p.ink};max-width:960px">${lead.parent}</div>
<div style="display:flex;justify-content:space-between;align-items:center;font-size:28px;color:${p.inkSoft}"><span>bezpłatnie · bez reklam</span><span style="font-weight:700;color:${p.ink}">jadwigo.pl</span></div>
</div>`;
  return page(`${look.name}: karta linku`, body, 1200, 630, p.ground);
}

function a6(look: Look): string {
  const p = look.day;
  const w = 560;
  const h = 794;
  const bg = look.mark === "crown" ? `background:${p.ground}` : grid(p);
  const body = `<div style="${bg};width:${w}px;height:${h}px;padding:44px 40px;display:flex;flex-direction:column;gap:22px;color:${p.ink}">
${wordmark(look, 46, p)}
<div style="font-size:30px;line-height:1.25;font-weight:700">Zrobiliśmy to dla naszej klasy.</div>
<div style="font-size:20px;line-height:1.4;color:${p.inkSoft}">Krótkie lekcje matematyki dla klas 1–3. Bez punktów, bez zegarów i bez reklam. Dane dziecka należą do rodzica.</div>
<ol style="font-size:20px;line-height:1.5;margin:0;padding-left:26px">
<li>Wejdź na <b>jadwigo.pl</b></li>
<li>Zagrajcie razem w pierwszą lekcję</li>
<li>Załóż konto, jeśli chcesz następną</li>
</ol>
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto">
<div style="font-size:18px;color:${p.inkSoft}">Pytania? Napisz do nas na czacie klasy.<br>Rodzice z klasy</div>
<div style="width:132px;height:132px;border:2px dashed ${p.line};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:15px;color:${p.inkSoft};background:${p.card}">kod QR</div>
</div>
</div>`;
  return page(`${look.name}: zaproszenie A6`, body, w, h, p.ground);
}

function poster(look: Look): string {
  const p = look.day;
  const w = 794;
  const h = 1123;
  const lead = data.leads[look.leans];
  if (!lead) throw new Error(`no lead ${look.leans}`);
  const bg = look.mark === "crown" ? `background:${p.ground}` : grid(p);
  const body = `<div style="${bg};width:${w}px;height:${h}px;padding:72px 64px;display:flex;flex-direction:column;gap:32px;color:${p.ink}">
<div style="align-self:flex-start;font-size:16px;color:${p.inkSoft};border:2px solid ${p.line};border-radius:9999px;padding:6px 14px;background:${p.card}">po pilotażu w jednej klasie</div>
${wordmark(look, 88, p)}
<div style="font-family:${face(look)};font-weight:700;font-size:46px;line-height:1.15">${lead.parent}</div>
<div style="font-size:26px;color:${p.inkSoft}">Lekcje matematyki dla klas 1–3, bezpłatnie i bez reklam.</div>
<div style="display:flex;gap:28px;align-items:center;margin-top:auto">
<div style="width:200px;height:200px;border:2px dashed ${p.line};border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:18px;color:${p.inkSoft};background:${p.card}">kod QR</div>
<div style="font-size:30px;font-weight:700">jadwigo.pl</div>
</div>
</div>`;
  return page(`${look.name}: plakat szkolny`, body, w, h, p.ground);
}

function character(story: Story, p: Palette, size: number): string {
  if (story.character === "lantern") return lantern("#2a4ea0", "#f2c14e", size);
  if (story.character === "crown") return crown("#ad7f1f", "#3f8a46", size);
  return trail(4, p.accent, Math.round(size * 1.8));
}

function name(story: Story): string {
  const look = data.looks[0];
  if (!look) throw new Error("no look");
  const p = look.day;
  const panel = (
    withCharacter: boolean,
  ) => `<div style="flex:1;background:#fff;border:2px solid ${p.line};border-radius:16px;padding:28px;display:flex;flex-direction:column;gap:18px">
<div style="font-size:15px;color:${p.inkSoft}">${withCharacter ? `z postacią: ${story.characterName}` : "bez postaci"}</div>
<div style="display:flex;align-items:center;gap:18px">${withCharacter ? character(story, p, 72) : ""}${wordmark(look, 40, p)}</div>
<div style="font-size:19px;line-height:1.4;color:${p.ink}">${story.story}</div>
${withCharacter ? `<div style="background:#fbf1d2;border:2px solid #a07c14;border-radius:12px;padding:12px 14px;font-size:17px;color:#5a4300">${story.characterName}: ${withCharacter && story.character === "steps" ? "każde zadanie to jeden ślad." : "świeci mocniej po dobrej odpowiedzi i nie gaśnie przy „jeszcze nie”."}</div>` : ""}
</div>`;
  const body = `<div style="${grid(p)};width:1200px;height:520px;padding:32px;display:flex;flex-direction:column;gap:16px">
<div style="font-weight:700;font-size:26px;color:${p.ink}">${story.name}</div>
<div style="display:flex;gap:24px;flex:1">${panel(false)}${panel(true)}</div>
</div>`;
  return page(`Historia: ${story.name}`, body, 1200, 520, p.ground);
}

function about(): string {
  const look = data.looks[0];
  if (!look) throw new Error("no look");
  const p = look.day;
  const frame = (label: string) =>
    `<div style="flex:1;height:300px;border:2px dashed ${p.line};border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;color:${p.inkSoft}">${label}</div>`;
  const body = `<div style="${grid(p)};width:1280px;height:720px;padding:56px 64px;color:${p.ink};display:flex;flex-direction:column;gap:28px">
<div style="font-weight:700;font-size:44px">O nas</div>
<div style="display:flex;gap:24px">${frame("zdjęcie rodziny (spoza repozytorium)")}${frame("zdjęcie w szkole (spoza repozytorium)")}</div>
<div style="font-size:22px;line-height:1.45;max-width:900px">${data.founder}</div>
<div style="font-size:19px;line-height:1.45;max-width:900px;color:${p.inkSoft}">${data.hackathon}</div>
<div style="display:flex;gap:14px;font-size:18px;color:${p.inkSoft}"><span>1 dziecko</span><span>→</span><span>1 klasa</span><span>→</span><span>1 szkoła</span></div>
</div>`;
  return page("O nas", body, 1280, 720, p.ground);
}

const out = (file: string, html: string) => writeFileSync(join(here, "diagrams", file), html);
for (const look of data.looks) {
  out(`hero-${look.id}.html`, hero(look, false));
  out(`phone-${look.id}.html`, hero(look, true));
  out(`card-${look.id}.html`, lessonCard(look));
  out(`og-${look.id}.html`, ogCard(look));
  out(`a6-${look.id}.html`, a6(look));
  out(`poster-${look.id}.html`, poster(look));
}
for (const story of data.stories) out(`name-${story.id}.html`, name(story));
out("about.html", about());

// voice.md is written whole from the data, so the sheet and the mocks never drift.
const keys = ["headline", "cta", "welcome", "right", "miss", "pause", "chat"] as const;
const header = `| Line | ${data.voices.map((v) => `${v.name} (${v.en})`).join(" | ")} |`;
const rule = `| --- | ${data.voices.map(() => "---").join(" | ")} |`;
const rows = keys.map(
  (k) =>
    `| ${data.lineNames[k]} · ${data.lineNamesEn[k]} | ${data.voices.map((v) => v.lines[k] ?? "").join(" | ")} |`,
);
const voiceMd = `:::meta
eyebrow: Jadwigo · identity
subtitle: The same 6 lines in 3 registers, plus the message for the class chat
by: the jadwigo-marketing session for dl-w0b4.27
when: 2026-10-27T15:00:00Z
:::

# Voice: the same lines in each register

Every register below says [the same 6 lines](data/identity.json). They are a landing headline, a parent's call to action, a child's welcome, a right answer, a miss and a pause. A last line sits under them: the message a parent posts in the class chat. It's there because the class chat is where the first families come from. Every line is a draft for a native speaker to review.

:::table The voice sheet (generated from data/identity.json by build.ts)
${header}
${rule}
${rows.join("\n")}
:::

## How each one sounds

${data.voices.map((v) => `- **${v.name}** (${v.en}): ${v.how}`).join("\n")}

## Rules every line keeps

- No line a child reads says "źle", "zły", "błąd", "błędnie", "niepoprawnie", "nie tak" or "porażka". A miss is "Jeszcze nie", which is information, not failure.
- No points, clocks, streaks or rankings, and no praise inflation. A child is "ty", and a parent is "Ty" with a capital, as on the rest of the site.
- No line asks a child to get a parent to buy or do anything (UOKiK). The chat message is written by a parent for parents.
- Numbers are digits, in Polish as in English.

:::aside
The lesson today already says "Dobrze!", "Jeszcze nie." and "Lekcja poczeka. Wrócisz do tego samego pytania." (david-learns \`frontend/src/copy/pl.ts\`, still \`reviewed: false\`). Whichever register the owner picks, those strings move to it in the follow-up issue, not here.
:::
`;
writeFileSync(join(here, "voice.md"), voiceMd);

// The contrast table in look.md sits between two markers and is rewritten on every build.
const lookPath = join(here, "look.md");
const table = [
  ":::table Contrast of every text pair by day and by night, from [data/contrast.json](data/contrast.json) against the [WCAG contrast minimum](https://www.w3.org/TR/WCAG21/#contrast-minimum)",
  "| Look | Pair | Kind | Day | Night |",
  "| --- | --- | --- | --- | --- |",
  ...contrastRows.map((r) => `| ${r.look} | ${r.pair} | ${r.kind} | ${r.day}:1 | ${r.night}:1 |`),
  ":::",
].join("\n");
try {
  const md = readFileSync(lookPath, "utf8");
  const start = "<!-- contrast:start -->";
  const end = "<!-- contrast:end -->";
  const a = md.indexOf(start);
  const b = md.indexOf(end);
  if (a >= 0 && b > a) {
    writeFileSync(lookPath, `${md.slice(0, a + start.length)}\n${table}\n${md.slice(b)}`);
  }
} catch {
  // look.md is written by hand; on the first build it may not exist yet.
}

const low = contrastRows.filter((r) => Math.min(r.day, r.night) < (r.kind === "text" ? 4.5 : 3));
process.stdout.write(`wrote ${data.looks.length * 6 + data.stories.length + 1} mocks\n`);
process.stdout.write(
  low.length ? `below threshold: ${JSON.stringify(low)}\n` : "every pair passes\n",
);
