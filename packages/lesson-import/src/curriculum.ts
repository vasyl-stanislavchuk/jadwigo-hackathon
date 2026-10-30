import type { CurriculumId, SkillId, Topic } from "@jadwigo/contracts";
import type { NewCurriculum, NewSkill, Store } from "@jadwigo/store";
import { FEATURED_POD } from "./ids.ts";

/**
 * The shared catalogue as the seed writes it: one curriculum, its topics by code, and the skills,
 * each naming its topic by code (`null` for none). packages/core's `catalogue()` (dl-liwi.15) is
 * read into this shape by `src/seed.ts`.
 */
export interface SeedCatalogue {
  readonly curriculum: NewCurriculum;
  readonly topics: readonly Pick<Topic, "code" | "area" | "text">[];
  readonly skills: readonly (Omit<NewSkill, "topic_id"> & { readonly topic: string | null })[];
}

/** What a seed wrote: the curriculum's id, and its topics and skills, each counted once. */
interface SeededCatalogue {
  readonly curriculum: CurriculumId;
  readonly topics: number;
  readonly skills: readonly SkillId[];
}

/**
 * Writes the shared catalogue into Jadwigo's own pod, the featured pod every pod reads
 * (decision jadwigo-hackathon/2026-10-30-the-shared-curriculum-lives-in-shared-postgres-tables-seeded-fro):
 * the curriculum, then its topics, then the skills, each skill's topic code resolved to the topic
 * row's id as it is written. Every write is once per key, so a 2nd run changes nothing. A skill
 * naming a topic the catalogue lacks is refused before anything is written.
 */
export async function seedCatalogue(
  store: Store,
  catalogue: SeedCatalogue,
): Promise<SeededCatalogue> {
  const codes = new Set(catalogue.topics.map((t) => t.code));
  for (const skill of catalogue.skills) {
    if (skill.topic !== null && !codes.has(skill.topic)) {
      throw new Error(
        `the skill ${skill.code} names the topic ${skill.topic}, which the catalogue lacks`,
      );
    }
  }
  return store.unit(async () => {
    const pod = (await store.putPod(FEATURED_POD)).id;
    const curriculum = await store.putCurriculum(pod, catalogue.curriculum);
    const topics = await store.putTopics(
      pod,
      catalogue.topics.map((t) => ({ ...t, curriculum_id: curriculum.id })),
    );
    const topicId = new Map(topics.map((t) => [t.code, t.id]));
    const skills = await store.putSkills(
      pod,
      catalogue.skills.map(({ topic, ...skill }) => ({
        ...skill,
        topic_id: topic === null ? null : (topicId.get(topic) ?? null),
      })),
    );
    return { curriculum: curriculum.id, topics: topics.length, skills: skills.map((s) => s.code) };
  });
}
