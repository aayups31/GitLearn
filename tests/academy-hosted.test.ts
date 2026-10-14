import { it, expect } from "vitest";
import { Pool, type PoolClient } from "pg";
import { parse } from "dotenv";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { serviceConfig } from "../services/ai/config";
import { HostedAcademy } from "../services/ai/academy";
it.skipIf(process.env.OUTCLASS_DATABASE_TEST !== "1")(
  "isolates real account access, freezes releases and consumes launch grants exactly once",
  async () => {
    const env = parse(await readFile(".local/ai-service.env")),
      pool = new Pool(serviceConfig(env).pool),
      db = await pool.connect();
    await db.query("BEGIN");
    // Every service transaction is a savepoint inside this test's rollback.
    const wrapped = {
      connect: async () =>
        ({
          query: (sql: string, values?: unknown[]) =>
            db.query(
              sql === "BEGIN"
                ? "SAVEPOINT academy_test"
                : sql === "COMMIT"
                  ? "RELEASE SAVEPOINT academy_test"
                  : sql === "ROLLBACK"
                    ? "ROLLBACK TO SAVEPOINT academy_test"
                    : sql,
              values,
            ),
          release: () => {},
        }) as unknown as PoolClient,
    } as Pool;
    const service = new HostedAcademy(wrapped),
      author = randomUUID(),
      learner = randomUUID(),
      other = randomUUID(),
      id = randomUUID(),
      course = {
        title: "Rollback-only Academy test",
        audience: "Test learners",
        outcome: "Verify a free enrollment",
        rightsConfirmed: true,
        lessons: [
          {
            title: "Apply it",
            objective: "Build a total",
            practice: "Test empty input",
            content: "A dictionary can accumulate a total.",
          },
        ],
      },
      input = {
        releaseId: id,
        lineageId: randomUUID(),
        revision: 1,
        course,
        projectTemplate: null,
        approvePublicRelease: true,
      };
    try {
      expect((await service.publish(author, input)).id).toBe(id);
      expect((await service.publish(author, input)).id).toBe(id);
      await expect(
        service.publish(author, {
          ...input,
          course: { ...course, title: "Mutated" },
        }),
      ).rejects.toThrow(/new version/);
      expect((await service.catalog()).some((c) => c.id === id)).toBe(true);
      await expect(service.grant(other, id, 0)).rejects.toThrow(/Enroll/);
      await service.enroll(learner, id);
      await service.enroll(learner, id);
      expect(
        (await service.mine(author)).find((c) => c.id === id).enrollments,
      ).toBe(1);
      const grant = await service.grant(learner, id, 0);
      await expect(service.redeem(other, grant.grant)).rejects.toThrow(
        /another account/,
      );
      expect((await service.redeem(learner, grant.grant)).course.title).toBe(
        course.title,
      );
      await expect(service.redeem(learner, grant.grant)).rejects.toThrow(
        /consumed/,
      );
      await expect(service.withdraw(other, id)).rejects.toThrow(/creator/);
      await service.withdraw(author, id);
      await expect(service.detail(id)).rejects.toThrow(/not publicly/);
      expect((await service.mine(other)).some((c) => c.id === id)).toBe(false);
    } finally {
      await db.query("ROLLBACK");
      db.release();
      await pool.end();
    }
  },
  30000,
);
