import type { MediaKind } from "./media-shared";

export type MediaDeletionTarget = {
  assetId: string;
  episodeId: string;
  kind: MediaKind;
  storageBucket: string;
  storagePath: string;
};

export type DatabaseDeletionResult =
  | {
      ok: true;
      assetId: string | null;
    }
  | {
      ok: false;
      error: string;
    };

export type StorageFailureAudit = {
  recorded: boolean;
};

export type PodcastMediaDeletionResult =
  | {
      ok: true;
      value: {
        assetId: string | null;
        kind: MediaKind;
        status: "deleted";
        databaseDeleted: true;
        storageDeleted: true;
      };
    }
  | {
      ok: false;
      error: string;
      partial?: {
        assetId: string;
        kind: MediaKind;
        status: "deleted";
        databaseDeleted: true;
        storageDeleted: false;
        auditEventRecorded: boolean;
      };
    };

type ExecutePodcastMediaDeletionInput = {
  kind: MediaKind;
  target: MediaDeletionTarget | null;
  deleteDatabase: () => Promise<DatabaseDeletionResult>;
  deleteStorage: (target: MediaDeletionTarget) => Promise<void>;
  auditStorageFailure: (
    target: MediaDeletionTarget,
    error: unknown,
  ) => Promise<StorageFailureAudit>;
};

/**
 * Coordinates the two systems involved in media deletion. The database
 * lifecycle is authoritative and runs first. Storage removal is then retried
 * safely using the durable asset coordinates supplied by the caller.
 */
export async function executePodcastMediaDeletion({
  kind,
  target,
  deleteDatabase,
  deleteStorage,
  auditStorageFailure,
}: ExecutePodcastMediaDeletionInput): Promise<PodcastMediaDeletionResult> {
  const database = await deleteDatabase();
  if (!database.ok) {
    return database;
  }

  if (!target) {
    return {
      ok: true,
      value: {
        assetId: database.assetId,
        kind,
        status: "deleted",
        databaseDeleted: true,
        storageDeleted: true,
      },
    };
  }

  if (database.assetId && database.assetId !== target.assetId) {
    return { ok: false, error: "rpc_error" };
  }

  try {
    await deleteStorage(target);
  } catch (error) {
    let auditEventRecorded = false;
    try {
      const audit = await auditStorageFailure(target, error);
      auditEventRecorded = audit.recorded;
    } catch {
      auditEventRecorded = false;
    }

    return {
      ok: false,
      error: "podcast_storage_delete_failed",
      partial: {
        assetId: target.assetId,
        kind,
        status: "deleted",
        databaseDeleted: true,
        storageDeleted: false,
        auditEventRecorded,
      },
    };
  }

  return {
    ok: true,
    value: {
      assetId: target.assetId,
      kind,
      status: "deleted",
      databaseDeleted: true,
      storageDeleted: true,
    },
  };
}
