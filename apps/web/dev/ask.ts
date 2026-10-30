/**
 * The ask endpoint (dl-a38n, lane bridge): `POST /@builder/ask` takes a comment pinned to a step
 * and appends it to the draft's asks file, behind a loopback admit gate (md's
 * templates/vite_config_md.mts:728-763 is the model). Step 0 leaves it empty; the lane's bead
 * (dl-a38n.13) names the gate, the caps and the file.
 */
import type { ViteDevServer } from "vite";

export function ask(_server: ViteDevServer): void {}
