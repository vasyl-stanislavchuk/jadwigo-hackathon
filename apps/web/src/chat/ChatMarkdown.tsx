/**
 * Jadwigo AI's chat words as markdown (design review 2026-11-02, after the chat in another of the
 * owner's projects): headings, bold, lists, tables, quotes and code drawn in the parent's density
 * with the house tokens (chat.css, `.jw-chat-md`). GFM adds lists with tasks, tables and
 * strikethrough. A single line break stays a line break, as the plain text showed it. Raw HTML is
 * never rendered (react-markdown's default), and neither is an image, a script or a frame; a link
 * opens in a new tab.
 */

import { memo, type ReactElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const COMPONENTS: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

const PLUGINS = [remarkGfm];
const REFUSED = ["img", "script", "iframe", "object", "embed"];

/** A lone newline is a line break in chat, as markdown's two trailing spaces would make it. */
const hardBreaks = (text: string): string => text.replace(/(?<!\n)\n(?!\n)/g, "  \n");

export const ChatMarkdown = memo(function ChatMarkdown({ text }: { text: string }): ReactElement {
  return (
    <div className="jw-chat-md" data-markdown>
      <ReactMarkdown remarkPlugins={PLUGINS} disallowedElements={REFUSED} components={COMPONENTS}>
        {hardBreaks(text)}
      </ReactMarkdown>
    </div>
  );
});
