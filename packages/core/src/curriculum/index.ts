import { Curriculum, Skill, Topic } from "@jadwigo/contracts";
import podstawa from "./podstawa-2017-klasy-1-3-matematyka.json" with { type: "json" };
import skills from "./skills.json" with { type: "json" };

/**
 * The shared catalogue's seed (dl-liwi.15, docs/research/curriculum-and-skills.md): one
 * curriculum, the 2017 podstawa for klasy I-III maths, its 26 outcomes as topics, and the skills.
 * The seed writer (`make db-seed`) puts them in Jadwigo's pod and gives each row its id, pod and
 * time, so a skill names its topic by code here.
 *
 * `podstawa-2017-klasy-1-3-matematyka.json` is the bank's file, copied byte for byte: public law
 * text. `skills.json` holds the bank's 138 skill ids with `proposed:` stripped, all `proposed`
 * until the owner reviews them, and the fixture dialects' codes, each with its aliases.
 */

/** The curriculum as the seed writes it: the store adds `id`, `pod_id` and `created_at`. */
const SeedCurriculum = Curriculum.pick({
  code: true,
  name: true,
  country: true,
  version: true,
  language: true,
  source_url: true,
});
export type SeedCurriculum = ReturnType<typeof SeedCurriculum.parse>;

/** One outcome as the seed writes it, under its curriculum. */
const SeedTopic = Topic.pick({ code: true, area: true, text: true });
export type SeedTopic = ReturnType<typeof SeedTopic.parse>;

/** A catalogue skill as the seed writes it: its topic by code, which the writer turns into an id. */
const SeedSkill = Skill.omit({ pod_id: true, created_at: true, topic_id: true }).extend({
  topic_code: Topic.shape.code.nullable(),
});
export type SeedSkill = ReturnType<typeof SeedSkill.parse>;

export interface Catalogue {
  readonly curriculum: SeedCurriculum;
  readonly topics: readonly SeedTopic[];
  readonly skills: readonly SeedSkill[];
}

/** The tag prefix the bank's sets carry for this curriculum, `pl-2017:II.3.3`. */
const CURRICULUM_CODE = "pl-2017";

let loaded: Catalogue | undefined;

/** The seed, parsed against the contracts once: a bad row throws here, not in the writer. */
export function catalogue(): Catalogue {
  loaded ??= {
    curriculum: SeedCurriculum.parse({
      code: CURRICULUM_CODE,
      name: "Podstawa programowa 2017, klasy I-III, edukacja matematyczna",
      country: "PL",
      version: "2017",
      language: "pl",
      source_url: podstawa.url,
    }),
    topics: podstawa.outcomes.map((o) =>
      SeedTopic.parse({ code: o.id, area: o.area_title, text: o.text }),
    ),
    skills: skills.map(({ topic, ...rest }) => SeedSkill.parse({ ...rest, topic_code: topic })),
  };
  return loaded;
}
