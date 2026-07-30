import assert from "node:assert/strict";
import test from "node:test";
import { executePodcastMediaDeletion } from "../lib/actions/podcast/media-delete-core.ts";

const target = {
  assetId: "11111111-1111-4111-8111-111111111111",
  episodeId: "22222222-2222-4222-8222-222222222222",
  kind: "audio",
  storageBucket: "podcast-audio",
  storagePath:
    "22222222-2222-4222-8222-222222222222/11111111-1111-4111-8111-111111111111.wav",
};

function successfulDatabaseDeletion(assetId = target.assetId) {
  return async () => ({ ok: true, assetId });
}

test("successful deletion removes the database reference and Storage object", async () => {
  let storageDeletes = 0;
  let failureAudits = 0;

  const result = await executePodcastMediaDeletion({
    kind: "audio",
    target,
    deleteDatabase: successfulDatabaseDeletion(),
    deleteStorage: async (received) => {
      assert.deepEqual(received, target);
      storageDeletes += 1;
    },
    auditStorageFailure: async () => {
      failureAudits += 1;
      return { recorded: true };
    },
  });

  assert.deepEqual(result, {
    ok: true,
    value: {
      assetId: target.assetId,
      kind: "audio",
      status: "deleted",
      databaseDeleted: true,
      storageDeleted: true,
    },
  });
  assert.equal(storageDeletes, 1);
  assert.equal(failureAudits, 0);
});

test("repeated deletion remains idempotent", async () => {
  let databaseDeletes = 0;
  let storageDeletes = 0;

  const execute = () =>
    executePodcastMediaDeletion({
      kind: "audio",
      target,
      deleteDatabase: async () => {
        databaseDeletes += 1;
        return {
          ok: true,
          assetId: databaseDeletes === 1 ? target.assetId : null,
        };
      },
      deleteStorage: async () => {
        storageDeletes += 1;
      },
      auditStorageFailure: async () => ({ recorded: true }),
    });

  const first = await execute();
  const repeated = await execute();

  assert.equal(first.ok, true);
  assert.equal(repeated.ok, true);
  assert.equal(databaseDeletes, 2);
  assert.equal(storageDeletes, 2);
});

test("an already-missing Storage object is a successful no-op", async () => {
  const result = await executePodcastMediaDeletion({
    kind: "audio",
    target,
    deleteDatabase: successfulDatabaseDeletion(),
    // Supabase Storage reports a missing object without an error. The adapter
    // therefore resolves normally and the orchestrator treats it as deleted.
    deleteStorage: async () => undefined,
    auditStorageFailure: async () => ({ recorded: true }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.storageDeleted, true);
});

test("a Storage API failure returns a partial result and emits an audit event", async () => {
  const storageError = new Error("simulated Storage failure");
  let auditedTarget = null;
  let auditedError = null;

  const result = await executePodcastMediaDeletion({
    kind: "audio",
    target,
    deleteDatabase: successfulDatabaseDeletion(),
    deleteStorage: async () => {
      throw storageError;
    },
    auditStorageFailure: async (receivedTarget, receivedError) => {
      auditedTarget = receivedTarget;
      auditedError = receivedError;
      return { recorded: true };
    },
  });

  assert.deepEqual(result, {
    ok: false,
    error: "podcast_storage_delete_failed",
    partial: {
      assetId: target.assetId,
      kind: "audio",
      status: "deleted",
      databaseDeleted: true,
      storageDeleted: false,
      auditEventRecorded: true,
    },
  });
  assert.deepEqual(auditedTarget, target);
  assert.equal(auditedError, storageError);
});
