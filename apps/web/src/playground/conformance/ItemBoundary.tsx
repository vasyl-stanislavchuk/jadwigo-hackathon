/**
 * One conformance item's error boundary (dl-a38n.32.1): a view that throws marks its own item
 * (`THREW`, read by checkBatch as `render-unplayable`) instead of taking the whole page down.
 */

import { Component, type ReactNode } from "react";
import { THREW } from "./batch.ts";

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly error: string | null;
}

export class ItemBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return <div {...{ [THREW]: this.state.error }} />;
  }
}
