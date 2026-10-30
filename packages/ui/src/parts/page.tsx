// The page a screen stands on (dl-uukj.32.3). "prose" is an app page (the parent's, the home list):
// one centred column at the prose width with the page padding, at the adult body size and leading,
// and it provides the "app" register to every part inside it (dl-uukj.32.17). "kid" is the learner's
// page: the .kid-page class and the data-learner-view and data-play markers that stage.css,
// lesson.css, StepShell, HelpLadder and stepKeys read, exactly as PlayScreen and HomeScreen write
// them today, so a play screen adopts it without a change in behaviour; it provides "lesson".
import type { ComponentProps, ReactElement } from "react";
import { RegisterProvider } from "../lib/register.tsx";
import { cn } from "../lib/utils.ts";

type Width = "prose" | "kid";

function Page({
  width = "prose",
  className,
  ...props
}: ComponentProps<"main"> & { width?: Width }): ReactElement {
  if (width === "kid")
    return (
      <RegisterProvider value="lesson">
        <main
          data-slot="page"
          data-width="kid"
          className={cn("kid-page", className)}
          data-learner-view
          data-play
          {...props}
        />
      </RegisterProvider>
    );
  return (
    <RegisterProvider value="app">
      <main
        data-slot="page"
        data-width="prose"
        className={cn(
          "mx-auto flex w-full max-w-(--page-prose-max) flex-col gap-6 p-6 text-jw-page-body leading-jw-page text-jw-ink",
          className,
        )}
        {...props}
      />
    </RegisterProvider>
  );
}

export { Page };
