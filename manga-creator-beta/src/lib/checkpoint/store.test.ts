import { describe, it, expect, beforeEach } from "vitest";
import {
  createMemoryCheckpointStore,
  getMemoryCheckpointStore,
  resetMemoryCheckpointStore,
  createEmptyCheckpoint,
} from "./store";

describe("checkpoint store (memory)", () => {
  beforeEach(() => {
    resetMemoryCheckpointStore();
  });

  it("saves and loads a checkpoint", async () => {
    const store = createMemoryCheckpointStore();
    const checkpoint = createEmptyCheckpoint("p1", "t1");
    checkpoint.title = "My Project";

    await store.save(checkpoint);
    const loaded = await store.load("p1");

    expect(loaded?.title).toBe("My Project");
    expect(loaded?.projectId).toBe("p1");
    expect(loaded?.threadId).toBe("t1");
    expect(loaded?.createdAt).toBeTruthy();
    expect(loaded?.updatedAt).toBeTruthy();
  });

  it("lists and deletes checkpoints", async () => {
    const store = getMemoryCheckpointStore();
    const checkpointA = createEmptyCheckpoint("pA", "tA");
    const checkpointB = createEmptyCheckpoint("pB", "tB");
    await store.save(checkpointA);
    await store.save(checkpointB);

    const all = await store.list();
    expect(all.map((c) => c.projectId).sort()).toEqual(["pA", "pB"]);

    await store.delete("pA");
    const remaining = await store.list();
    expect(remaining.map((c) => c.projectId)).toEqual(["pB"]);
  });
});
