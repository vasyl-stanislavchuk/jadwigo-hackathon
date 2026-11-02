import type { Language } from "@jadwigo/contracts";
import { Body, Container, Head, Html, Preview, Text } from "@react-email/components";

/** The words of one auth mail, each from packages/copy's `email_*` messages (render.ts). */
export interface AuthEmailWords {
  readonly subject: string;
  readonly lead: string;
  readonly codeLabel: string;
  readonly expiry: string;
  readonly ignore: string;
}

export interface AuthEmailProps {
  readonly language: Language;
  readonly token: string;
  readonly words: AuthEmailWords;
}

/**
 * One auth mail: the code first and big, since it is what the parent came for (dl-liwi.33), then
 * one line on what it is for, how long it works, and what to do if it was not them. No link: the
 * parent types the code into the tab that asked for it (apps/web/src/parent/auth.ts).
 */
export function AuthEmail({ language, token, words }: AuthEmailProps) {
  return (
    <Html lang={language}>
      <Head />
      <Preview>{`${words.codeLabel}: ${token}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={label}>{words.codeLabel}</Text>
          <Text style={code}>{token}</Text>
          <Text style={line}>{words.lead}</Text>
          <Text style={line}>{words.expiry}</Text>
          <Text style={quiet}>{words.ignore}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { margin: "0 auto", padding: "24px 16px", maxWidth: "480px" };
const label = { fontSize: "16px", color: "#333333", margin: "0" };
const code = {
  fontSize: "36px",
  fontWeight: "bold",
  letterSpacing: "8px",
  color: "#111111",
  margin: "8px 0 24px",
};
const line = { fontSize: "16px", lineHeight: "24px", color: "#333333", margin: "0 0 12px" };
const quiet = { fontSize: "14px", lineHeight: "20px", color: "#666666", margin: "24px 0 0" };
