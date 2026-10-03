// INFO: the db port: run SQL against the local database and read rows back, in core's vocabulary and with no library type.
export type SqlValue = string | number | null;

export interface DbExecutor {
  // Runs one statement that returns no rows. Rejects if the statement fails.
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  // Runs one query and returns its rows, unvalidated: core parses them with zod.
  all(sql: string, params?: readonly SqlValue[]): Promise<unknown[]>;
}

export interface DbPort extends DbExecutor {
  // Runs work in one transaction: committed if it resolves, rolled back (and rejected) if it rejects.
  transaction(work: (tx: DbExecutor) => Promise<void>): Promise<void>;
}
