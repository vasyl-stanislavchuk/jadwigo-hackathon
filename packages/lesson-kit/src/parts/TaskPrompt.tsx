/**
 * Part: the task's prompt line, large (dl-0ax3.2). Sizes are the kid layer's (blocks.md "Sizes and
 * the kid layer"): the prompt at --kid-say-size, 28 px or more. Every block that states a task
 * shows it through this, with its backtick spans as inline code (dl-i952.19) and its bold and
 * maths drawn (dl-r772.6). `say` itself never holds TeX (validate.ts `tex_in_say`); a stem that
 * replaces it may.
 */

import { RichText } from "./RichText.tsx";

export function TaskPrompt({ text }: { text: string }): JSX.Element {
  return (
    <p className="kid-prompt text-[length:var(--kid-say-size)] font-semibold leading-snug">
      <RichText inline text={text} />
    </p>
  );
}
