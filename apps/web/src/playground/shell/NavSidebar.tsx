/**
 * The left-hand navigation: the start page and the System page, then the interaction families. A
 * family row only opens and closes its question types, each with a small word for where it stands
 * (Refined, Draft, Idea). The filter finds a question type by its label, its code name, what the
 * learner does or when it fits.
 */

import {
  FAMILIES,
  type FamilyName,
  familyInfo,
  type QuestionTypeInfo,
  questionTypesOf,
} from "@jadwigo/lesson-kit";
import { BookOpen, ChevronRight, Compass, Layers } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { linkTo, playgroundRoute, useLocation } from "../route.ts";
import { STATUS_MEANS, statusLabel } from "../status.ts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../tool/collapsible.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "../tool/sidebar.tsx";
import { NavLink } from "./NavLink.tsx";

function matches(p: QuestionTypeInfo, filter: string): boolean {
  const f = filter.trim().toLowerCase();
  if (f === "") return true;
  return [p.label, p.name, p.does, p.fits, p.family].some((s) => s.toLowerCase().includes(f));
}

export function NavSidebar(): ReactElement {
  const { path } = useLocation();
  const route = playgroundRoute(path);
  const [filter, setFilter] = useState("");
  const { setOpenMobile } = useSidebar();
  const close = (): void => setOpenMobile(false);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-3 p-3">
        <NavLink
          href={linkTo("/playground")}
          onNavigate={close}
          className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-sidebar-accent"
        >
          <Layers className="size-5 text-primary" aria-hidden />
          <span className="flex flex-col leading-tight">
            <span className="font-semibold">Question-type playground</span>
            <span className="text-muted-foreground text-xs">
              Every family and question type, in the lesson frame
            </span>
          </span>
        </NavLink>
        <SidebarInput
          placeholder="Find a question type…"
          aria-label="Find a question type"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={route?.family === null && route.page === undefined}
              >
                <NavLink href={linkTo("/playground")} onNavigate={close}>
                  <Compass aria-hidden />
                  <span>Start here</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={route?.page === "system"}>
                <NavLink
                  href={linkTo("/playground/system")}
                  onNavigate={close}
                  data-nav-page="system"
                >
                  <BookOpen aria-hidden />
                  <span>System</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Families</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {FAMILIES.map((family) => {
                const types = questionTypesOf(family).filter((p) => matches(p, filter));
                if (types.length === 0) return null;
                return (
                  <FamilyItem
                    key={family}
                    family={family}
                    types={types}
                    current={route?.family === family}
                    questionType={route?.question_type ?? null}
                    forceOpen={filter.trim() !== ""}
                    close={close}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function FamilyItem({
  family,
  types,
  current,
  questionType,
  forceOpen,
  close,
}: {
  family: FamilyName;
  types: QuestionTypeInfo[];
  current: boolean;
  questionType: string | null;
  forceOpen: boolean;
  close(): void;
}): ReactElement {
  const info = familyInfo(family);
  const [open, setOpen] = useState(current);
  // The family you land on opens; you can still close it.
  useEffect(() => {
    if (current) setOpen(true);
  }, [current]);
  const isOpen = open || forceOpen;
  return (
    <SidebarMenuItem data-nav-family={family}>
      <Collapsible open={isOpen} onOpenChange={setOpen} className="group/family">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={info.does}
            aria-label={`${info.label}: show or hide its question types`}
          >
            <ChevronRight
              className="transition-transform group-data-[state=open]/family:rotate-90"
              aria-hidden
            />
            <span className="truncate font-medium">{info.label}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <SidebarMenuBadge>{types.length}</SidebarMenuBadge>
        <CollapsibleContent>
          <SidebarMenuSub>
            {types.map((p) => (
              <SidebarMenuSubItem key={p.name} data-nav-question-type={p.name}>
                <SidebarMenuSubButton asChild isActive={current && questionType === p.name}>
                  <NavLink href={linkTo(`/playground/${family}/${p.name}`)} onNavigate={close}>
                    <span className="truncate">{p.label}</span>
                    <span
                      className="text-muted-foreground ml-auto text-[0.65rem]"
                      title={STATUS_MEANS[p.status]}
                      data-status={p.status}
                    >
                      {statusLabel(p)}
                    </span>
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
