/**
 * The featured lesson `/` opens (dl-5ssh.3.1). Until `GET /api/v1/featured` lands (dl-5ssh.3.2),
 * it is equal-groups' featured assignment, the id `featuredAssignmentId("equal-groups")` gives in
 * packages/lesson-import/src/ids.ts. That function hashes with node:crypto, which a browser does
 * not have, so the id is written here and featured.test.ts checks the two agree. This one function
 * is what changes when the route lands.
 */

import { AssignmentId } from "@jadwigo/contracts";

const EQUAL_GROUPS = "asg_0ectzj2evqb95a3v1v6wewjzy3";

export function featuredAssignment(): AssignmentId {
  return AssignmentId.parse(EQUAL_GROUPS);
}
