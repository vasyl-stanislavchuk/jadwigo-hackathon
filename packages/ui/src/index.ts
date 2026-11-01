// Zeszyt's styles live in ./styles/tailwind.css (exported as "@jadwigo/ui/styles.css"); the app
// imports it once. What follows is the code: cn(), the theme helpers, the primitives, and the parts
// an app page is built from (dl-uukj.32.3), and the register they draw in (dl-uukj.32.17).

export {
  type Density,
  DensityScope,
  type Register,
  RegisterProvider,
  useDensity,
  useRegister,
} from "./lib/register.tsx";
export { followSystemTheme, heldTheme, holdTheme, type Theme } from "./lib/theme.ts";
export { cn } from "./lib/utils.ts";
export { Field } from "./parts/field.tsx";
export { Heading } from "./parts/heading.tsx";
export { Label } from "./parts/label.tsx";
export { Link, linkVariants } from "./parts/link.tsx";
export { Logo } from "./parts/logo.tsx";
export { Notice } from "./parts/notice.tsx";
export { OutcomeTile } from "./parts/outcome-tile.tsx";
export { Page } from "./parts/page.tsx";
export { Badge, badgeVariants } from "./primitives/badge.tsx";
export { Breadcrumb, type Crumb } from "./primitives/breadcrumb.tsx";
export { Button, buttonVariants } from "./primitives/button.tsx";
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./primitives/card.tsx";
export type { Choice, ControlSize } from "./primitives/choice.ts";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "./primitives/dialog.tsx";
export { Disc } from "./primitives/disc.tsx";
export { Input } from "./primitives/input.tsx";
export { PanelToggle } from "./primitives/panel-toggle.tsx";
export { Popover, PopoverContent, PopoverTrigger } from "./primitives/popover.tsx";
export { Progress } from "./primitives/progress.tsx";
export { RadioGroup } from "./primitives/radio-group.tsx";
export { SegmentedControl } from "./primitives/segmented-control.tsx";
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./primitives/sheet.tsx";
export { type MenuEntry, type MenuItem, SideMenu } from "./primitives/side-menu.tsx";
export { Slider } from "./primitives/slider.tsx";
export { Spinner } from "./primitives/spinner.tsx";
export { Switch } from "./primitives/switch.tsx";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./primitives/table.tsx";
export { Tabs } from "./primitives/tabs.tsx";
export { Toggle, toggleVariants } from "./primitives/toggle.tsx";
export { ToggleGroup, ToggleGroupItem } from "./primitives/toggle-group.tsx";
export { VisuallyHidden } from "./visually-hidden.tsx";
