import { afterEach, describe, expect, it, vi } from "vitest";
import { devMediaUrl, mediaSrc, mediaUrl, withMedia } from "./media.ts";

const BASE = "https://dx5i3bka3zn5f.cloudfront.net";
const REF = "49eb6e79d51b5bc51d51bccdcd8c6f9d5c62e3126fa866e64e7a543dbd7bb6ed.png";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mediaSrc", () => {
  it("puts a bare ref under the media URL", () => {
    expect(mediaSrc(REF, BASE)).toBe(`${BASE}/${REF}`);
    expect(mediaSrc(REF, `${BASE}/`)).toBe(`${BASE}/${REF}`);
  });

  it("puts a media: ref, and the prototype's /media/khan/ path, under the media URL", () => {
    expect(mediaSrc(`media:${REF}`, BASE)).toBe(`${BASE}/${REF}`);
    expect(mediaSrc(`/media/khan/${REF}`, BASE)).toBe(`${BASE}/${REF}`);
  });

  it("leaves an absolute http(s) address as it is", () => {
    expect(mediaSrc(`https://cdn.kastatic.org/ka-perseus-images/${REF}`, BASE)).toBe(
      `https://cdn.kastatic.org/ka-perseus-images/${REF}`,
    );
    expect(mediaSrc("http://example.test/a.svg", BASE)).toBe("http://example.test/a.svg");
  });

  it("leaves a data: URL, and anything that is not a ref, as it is", () => {
    const dot = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'/>";
    expect(mediaSrc(dot, BASE)).toBe(dot);
    expect(mediaSrc("/media/tts/abc.mp3", BASE)).toBe("/media/tts/abc.mp3");
    expect(mediaSrc("media:not-a-ref.png", BASE)).toBe("media:not-a-ref.png");
  });

  it("reads VITE_MEDIA_URL, and keeps a ref same-origin when it is unset", () => {
    vi.stubEnv("VITE_MEDIA_URL", `${BASE}/`);
    expect(mediaUrl()).toBe(BASE);
    expect(mediaSrc(REF)).toBe(`${BASE}/${REF}`);
    vi.stubEnv("VITE_MEDIA_URL", "");
    expect(mediaSrc(REF)).toBe(`/${REF}`);
  });
});

describe("withMedia", () => {
  it("rewrites src, image and picture strings at any depth and nothing else", () => {
    const data = {
      template: `See ${REF}`,
      stem: { image: `media:${REF}`, pictures: [{ src: REF, alt: REF, width: 1, height: 1 }] },
      hints: [{ text: "x", picture: `/media/khan/${REF}` }],
    };
    expect(withMedia(data, BASE)).toEqual({
      template: `See ${REF}`,
      stem: {
        image: `${BASE}/${REF}`,
        pictures: [{ src: `${BASE}/${REF}`, alt: REF, width: 1, height: 1 }],
      },
      hints: [{ text: "x", picture: `${BASE}/${REF}` }],
    });
    expect(data.stem.pictures[0]?.src).toBe(REF);
    expect(withMedia(null, BASE)).toBeNull();
  });

  it("rewrites the address of a markdown image inside any text, and only that (dl-a38n.32.40)", () => {
    const data = {
      items: [{ id: "i1", text: `![The shortest ribbon.]( /media/khan/${REF})` }],
      options: [
        {
          content: {
            kind: "text",
            text: `$A$ ![A bar in 3 parts.](${REF})$=$![A bar in 6 parts.](media:${REF})`,
          },
        },
        { content: { kind: "text", text: "![A dog.](https://cdn.example.test/dog.png) and $2$" } },
      ],
      say: `Not a picture: [${REF}](x) and ${REF}`,
    };
    expect(withMedia(data, BASE)).toEqual({
      items: [{ id: "i1", text: `![The shortest ribbon.]( ${BASE}/${REF})` }],
      options: [
        {
          content: {
            kind: "text",
            text: `$A$ ![A bar in 3 parts.](${BASE}/${REF})$=$![A bar in 6 parts.](${BASE}/${REF})`,
          },
        },
        { content: { kind: "text", text: "![A dog.](https://cdn.example.test/dog.png) and $2$" } },
      ],
      say: `Not a picture: [${REF}](x) and ${REF}`,
    });
  });
});

describe("devMediaUrl", () => {
  const example = `# a comment\nVITE_MEDIA_URL=${BASE}\n`;

  it("takes the URL set, else the one .env.example names", () => {
    expect(devMediaUrl("https://elsewhere.test", example)).toBe("https://elsewhere.test");
    expect(devMediaUrl(undefined, example)).toBe(BASE);
  });

  it("keeps a URL set blank on purpose blank, and is blank when the example names none", () => {
    expect(devMediaUrl("", example)).toBe("");
    expect(devMediaUrl(undefined, "# nothing here\n")).toBe("");
  });
});
