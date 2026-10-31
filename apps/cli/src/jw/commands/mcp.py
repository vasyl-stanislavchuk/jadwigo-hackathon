"""jw mcp serve: the question and lesson tools over MCP on stdio (dl-u1y5.23, moved from dl-e8ov.5.2.8).

Ten tools, each calling the function its `--json` verb prints, so a tool's JSON is the verb's
JSON: question_search (`jw question search --json`), question_show (`jw question show --json`),
question_gaps (`jw question gaps --json`), question_item (`jw question item --json`, read
from JW_KHAN_CONVERTED, dl-e8ov.5.38.2), lesson_draft (`jw lesson draft --json`), lesson_check
(`jw lesson check --json`, which runs check.ts in JADWIGO_REPO_DIR, dl-e8ov.5.38.4), and
lesson_edit and lesson_show (`jw lesson edit --json`, `jw lesson show`: one step changed by a JSON
merge patch and checked, or shown as it stands, dl-a38n.29), and lesson_publish (`jw lesson
publish --json`: the checked draft imported into the local database and played once,
dl-a38n.39), and doctor (`jw doctor --json`: whether this machine can draft, check and publish,
and the fix for each line that is not ok, dl-a38n.42). A draft is
kept on the server's machine under a draft_id, so neither lesson tool sends the whole draft
through the client's tool-result limit (dl-e8ov.5.38.10), and both write it as a lesson file,
<draft_id>.json, with its check, <draft_id>.check.json, into JADWIGO_DRAFTS_DIR on every call
(dl-a38n.16). lesson_check and lesson_edit also return the page's own render findings,
<draft_id>.render.json, when the lesson builder's page has written one (dl-a38n.28). The server
finds the bank the way the verbs do (`jw.settings_keys`: JW_API_URL, then JW_BANK_URL, then
~/.config/jadwigo-bank/bank.env) and reads pages from the bank checkout (JADWIGO_BANK_DIR, else
the clone jw bank pull makes, dl-a38n.60). Registration lines for
Claude Code, Muse Code and Codex are in apps/cli/README.md.

Built on the `mcp` package, 2.x (`mcp.server.mcpserver.MCPServer`, FastMCP's new name).
"""

from __future__ import annotations

from typing import Any

import click

from jw import doctor, lesson, lesson_edit, lesson_publish
from jw.commands import question
from jw.errors import JwError

TOOLS = (
    "question_search",
    "question_show",
    "question_gaps",
    "question_item",
    "lesson_draft",
    "lesson_check",
    "lesson_edit",
    "lesson_show",
    "lesson_publish",
    "doctor",
)


def build_server() -> Any:
    """The MCP server with the ten tools. Imported lazily: only `serve` pays for it."""
    from mcp.server.mcpserver import MCPServer
    from mcp.server.mcpserver.exceptions import ToolError

    server = MCPServer(
        name="jadwigo",
        instructions=(
            "Jadwigo's question bank and lesson drafts. To make a lesson from a parent's request: "
            "call lesson_draft, which copies each drawn question whole from the bank, its help "
            "included, keeps the draft under a draft_id and writes it to draft_path. Write only "
            "what each question's you_write lists (the twin, boost_by_mistake for its "
            "mistake_classes, a rung the copy leaves empty), in the lesson's language, and change a "
            "copied part only when the parent asks. Then call lesson_check with the draft_id and "
            "those words by step id, and fix what its findings list by step id until it answers "
            "ok with a card. Each call rewrites the draft file, so the lesson can be watched as it "
            "is built. To change one step after that, read it with lesson_show and patch it with "
            "lesson_edit, which answers with that step's findings and card. question_search, "
            "question_show, question_gaps and question_item look into the bank directly: sets "
            "that meet a need, one set's page, needs it cannot meet, one item. Once a check "
            "answers ok, call lesson_publish with the draft_id, without asking: it imports the "
            "lesson into the local database, checks that it plays, and returns the play_url to "
            "give the parent. When a tool fails on a setting, a missing file or a service, call "
            "doctor and tell the parent the fix it names."
        ),
    )

    def _call(fn: Any, **kwargs: Any) -> dict[str, Any]:
        try:
            result: dict[str, Any] = fn(**kwargs)
        except JwError as exc:
            hint = f" ({exc.hint})" if exc.hint else ""
            # ToolError: the client reads the message; any other exception stays on the server.
            raise ToolError(f"{exc}{hint}") from exc
        return result

    @server.tool(name="question_search")
    def question_search(
        grade: str,
        words: str | None = None,
        words_en: str | None = None,
        skills: list[str] | None = None,
        mistakes: list[str] | None = None,
        language: str = "pl",
        limit: int = 20,
        arm: str | None = None,
        stage: str | None = None,
    ) -> dict[str, Any]:
        """Search the bank for question sets that meet a need; the bank's search envelope.

        grade is the bare grade number ("3"); words is the need in plain words in `language`
        (pl, en or uk). arm and stage reach only the bank's own route (JW_BANK_URL); the /api/v1
        route answers stage final with every arm.
        """
        return _call(
            question.search_envelope,
            grade=grade,
            words=words,
            words_en=words_en,
            skills=skills or [],
            mistakes=mistakes or [],
            language=language,
            limit=limit,
            arm=arm,
            stage=stage,
        )

    @server.tool(name="question_show")
    def question_show(set_id: str) -> dict[str, Any]:
        """One question set page by its id (a `set_...` id from a search row)."""
        return _call(question.show_page, set_id=set_id)

    @server.tool(name="question_gaps")
    def question_gaps(
        grade: str,
        words: list[str] | None = None,
        skills: list[str] | None = None,
        language: str = "pl",
        arm: str | None = None,
    ) -> dict[str, Any]:
        """Search each need once (one per words, one per skill) and say which find nothing.

        A need whose every found set has no lesson-ready item in its language is a gap too, with
        reason "no item is lesson-ready in <lang>", followed, when the converted files can say, by
        "; most: <cause>, <n> of <m> items (<bead>)": the cause most of those sets' items share
        and the bead fixing it. not_ready lists such sets.
        """
        return _call(
            question.gaps_report,
            grade=grade,
            words=words or [],
            skills=skills or [],
            language=language,
            arm=arm,
        )

    @server.tool(name="question_item")
    def question_item(item_id: str, language: str = "pl") -> dict[str, Any]:
        """One converted item by its id: the composer's view, never shown to a child.

        Returns the family step a lesson file's question takes (family, data, key, help), the
        say line, the credit and based_on (`khan:<id>`). The key and help are in it, so use it to
        draft a lesson and never paste it where a child reads. language is the item's language
        (pl by default); an item in another language is an error. Only a lesson-ready item loads
        (its status plays, checked for render, key and pictures); any other is an error saying
        why: "renders wrong: <rule>", "not checked", "flagged: <reason>" or the converter's own.
        """
        return _call(question.item_view, item_id=item_id, language=language)

    @server.tool(name="lesson_draft")
    def lesson_draft(
        request: str,
        grade: str,
        names: list[str],
        topic: str,
        language: str = "pl",
        kind: str = "practice",
        count: int | None = None,
        skills: list[str] | None = None,
        verbose: bool = False,
    ) -> dict[str, Any]:
        """Draft a lesson for a parent's request: questions drawn from the bank and copied whole.

        request is the parent's words ("6 zadań z mnożenia, klasa 3"); names is required: pass
        every name the family uses in the request (the child's, siblings', the parent's), or []
        when there is none; the tool replaces them before anything leaves the machine. topic is
        required: what the lesson is about in a few words, distilled from the request, with no
        count, grade or name ("mnożenie", "dodawanie do 100"); the bank searches these words,
        and the request is kept as the draft's record and title. grade the bare grade number;
        kind practice, review, check or diagnostic; count overrides the draw rule's count. Each
        question is copied whole from the bank (family, data, key, say, pictures, and the
        source's hints and worked lines as its help), so the lesson plays as copied. Its twin is
        a sibling item of the same set, problem type and look, with another answer, copied whole
        with its credit, when the bank has one (twin_source "bank khan:<id>"); the item's own
        mistake cards are kept. The draft stays on this machine under draft_id; the result is a
        slim view of it. Per question: step_id, item_id, say, data (pictures without their
        labels or address), key (without the rule jw adds by code), you_write (what is left
        for you: twin only without a bank twin), cards_to_write (the classes whose mistake card the item lacks, when
        you_write names boost_by_mistake), twin_source, mistake_classes (the keys
        boost_by_mistake may use; null when unknown), why_drawn (its problem type), and, only
        when you_write names a rung, copied_help (the hints as text with their picture alts)
        and rungs (what fills look, boost, almost and worked). left_out is {total, by_cause:
        [{cause, count, examples}]}; lesson_show has the whole list. setup_warning, when
        present, says this machine's bank copy is out of step: tell the owner to run jw doctor
        and jw bank pull. rule_settled is false (the draw rules are provisional). draft_path is
        the lesson file as copied, written in JADWIGO_DRAFTS_DIR before the call returns, with
        its check beside it. verbose true returns every question whole (family, the full key,
        set, skill, question type, the draw's whole reason, copied_help and rungs) and left_out
        whole. Write what you_write lists, in the lesson's language, then call lesson_check
        with the draft_id.
        """
        return _call(
            lesson.draft,
            request=request,
            grade=grade,
            names=names,
            topic=topic,
            language=language,
            kind=kind,
            count=count,
            skills=skills or [],
            verbose=verbose,
        )

    @server.tool(name="lesson_check")
    def lesson_check(
        draft_id: str,
        help: dict[str, dict[str, Any]],
        title: str | None = None,
        reasoning: str | None = None,
        names: list[str] | None = None,
        full: bool = False,
        verbose: bool = False,
    ) -> dict[str, Any]:
        """Check a draft with your words on it, and return the card a parent reads.

        draft_id is the one lesson_draft returned. help maps each step_id to your words for that
        question, only what its you_write lists: twin (when the bank has no sibling item for it:
        a question from the same template with its own say, data and key), boost_by_mistake
        ({mistake class: {"text"}}, for the classes in cards_to_write; the item's own cards
        stay), and a rung the copy leaves empty (look and boost as {"text"}, almost and worked
        as lists of lines). To change a copied part, only when the parent asks, add changes:
        [{"change": numbers, context, wording or tutor_notes, "why", "set": {path: value}}],
        where a path is say, or a dotted path under data, key, hints, worked or almost
        ("hints.0.text"); each change is recorded in based_on.changes. Send only the steps you
        change: a step left out keeps what the draft holds (its words, the bank's twin,
        lesson_edit's changes), and help {} checks the draft as it stands. Every word but a key
        has the names you pass replaced, as for lesson_draft; title and reasoning replace the
        draft's. Every call rewrites the draft file (draft_path) with your words as far as they
        go, and writes its check beside it. ok true returns the card (per question: prompt and
        key as plain text, twin {prompt, key, source}, source, licence, and changes when there
        are any; and next: publish with lesson_publish), warns ({rule: count}), the lesson_file
        path, play_path and lesson_id. full true adds each rung and why it was drawn to the
        card; verbose true lists every finding instead of warns. ok false lists findings, each
        a step_id, path, level (error or warn), rule, text and fix; ok is false while one is an
        error. Fix those and call lesson_check again.
        """
        return _call(
            lesson.check,
            draft_id=draft_id,
            words=help,
            title=title,
            reasoning=reasoning,
            names=names or [],
            full=full,
            verbose=verbose,
        )

    @server.tool(name="lesson_edit")
    def lesson_edit_tool(
        draft_id: str,
        step_id: str,
        patch: dict[str, Any],
        why: str | None = None,
        change: str = lesson_edit.CHANGE_DEFAULT,
        names: list[str] | None = None,
    ) -> dict[str, Any]:
        """Change one step of a draft and get that step's findings back, without resending the rest.

        patch is a JSON merge patch on the step as lesson_show returns it: an object merges into
        what is there, null removes a part, anything else replaces it. It may set say and
        question's data, key and help (look, boost, almost, worked, hints, boost_by_mistake and
        twin, under question.help). A change to a part the bank's copy has (say, data, key, hints,
        worked, a copied almost) needs why, the parent's ask; it is recorded in based_on.changes
        with change (numbers, context, wording or tutor_notes; wording by default). A rung, twin
        or mistake card you write needs no why. The draft file is rewritten, check.ts runs on the
        whole lesson and its check file is rewritten. Returns ok (no error for this step),
        step_id, findings for this step only, render (the page's findings for it from its last
        draw, stale when drawn before this write; null without the page), the step's card,
        lesson_ok (the whole lesson's check) and draft_path. A patch that is not an object, or
        sets a part as the wrong kind, is refused with rule edit and changes nothing. Pass names
        as for lesson_draft: they are replaced in every word but a key, and in why. A later
        lesson_check keeps this edit unless it is sent words for this step.
        """
        return _call(
            lesson_edit.edit,
            draft_id=draft_id,
            step_id=step_id,
            patch=patch,
            why=why,
            change=change,
            names=names or [],
        )

    @server.tool(name="lesson_publish")
    def lesson_publish_tool(draft_id: str, target: str = "local") -> dict[str, Any]:
        """Publish a checked draft into the local database make dev serves, and check it plays.

        Call it once lesson_check (or lesson_edit) answered ok, without asking: it refuses a
        draft whose last check is not ok or is older than the draft. target is local; dev is the
        owner's (the refusal names the command for them) and the live app is never published
        from here. It imports the draft, then checks that the local api answers, that a preview
        attempt starts with every question planned, and that the play page answers. Returns ok
        (every check passed), play_url (absolute: give it to the parent), verified (api_health,
        attempt_started and play_page, each {ok, status, detail}; a detail says what failed),
        verified_at, lesson_id, version, assignment_id, timings and publish_path.
        """
        return _call(lesson_publish.publish, draft_id=draft_id, target=target)

    @server.tool(name="doctor")
    def doctor_tool(language: str = "pl") -> dict[str, Any]:
        """Check whether this machine can draft, check and publish a lesson, and say what to fix.

        Five checks, each ok, warn or fail: settings (the bank checkout, the converted items
        file, readiness.json, bank.env at mode 600, check.ts and bun, the drafts directory),
        ready ids (every set page's ready ids are lesson-ready in the converted file; the stale
        ones counted with 3 examples), stamps (readiness.json, the converted file and the pages
        name one stamp), bank_rev (the search service's build against the local index) and
        services (the local api and web dev server answer). Returns status (the worst) and
        checks, each {n, name, status, lines: [{name, status, detail, fix}]}. Call it when
        another tool fails on a setting, a missing file or a service; it changes nothing.
        """
        return _call(doctor.run, language=language)

    @server.tool(name="lesson_show")
    def lesson_show(draft_id: str, step_id: str | None = None) -> dict[str, Any]:
        """The draft as it stands: one step (step_id) or every step, as the lesson file holds it.

        Returns draft_id, draft_path, title, steps (each the step and its findings from the last
        check) and render (the page's findings from its last draw, null without the page). Read
        a step here before you patch it with lesson_edit.
        """
        return _call(lesson_edit.show, draft_id=draft_id, step_id=step_id)

    return server


@click.group()
def group() -> None:
    """MCP server: serve."""


@group.command()
def serve() -> None:
    """Serve the question and lesson tools over MCP on stdio."""
    build_server().run("stdio")
