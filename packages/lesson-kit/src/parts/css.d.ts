// A part's stylesheet (TerminalCard's terminal.css, KaTeX's) is imported for its side effect; the
// app's bundler and Vitest load it, and it exports nothing.
declare module "*.css";
