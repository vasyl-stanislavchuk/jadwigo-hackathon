import type { InvokeCommand } from "@aws-sdk/client-lambda";
import { RunId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { lambdaPoke } from "./poke.ts";

const ARN = "arn:aws:lambda:eu-central-1:000000000000:function:jadwigo-runner-test:live";
const STEP = { run_id: RunId.parse("run_7qre3atahx8cpak6xbjtz73var"), attempt: 2 };

describe("lambdaPoke (dl-z5ja.88)", () => {
  it("invokes the live alias asynchronously with the step as its payload", async () => {
    const sent: InvokeCommand[] = [];
    const poke = lambdaPoke(ARN, { send: async (command) => void sent.push(command) });
    await poke?.(STEP);
    expect(sent).toHaveLength(1);
    const input = sent[0]?.input;
    expect(input?.FunctionName).toBe(ARN);
    expect(input?.InvocationType).toBe("Event");
    expect(JSON.parse(new TextDecoder().decode(input?.Payload as Uint8Array))).toEqual(STEP);
  });

  it("pokes nothing when no alias is named", () => {
    expect(lambdaPoke(undefined, { send: async () => undefined })).toBeUndefined();
  });
});
