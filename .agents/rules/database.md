---
title: MongoDB Read-Only Constraint
description: Enforces strict read-only access on the MongoDB database connection
---

# MongoDB Read-Only Safety Protocol

This workspace connects to the MongoDB cluster (`Cluster0` / `faceerp`).

## Enforced Constraints:
1. **Zero-Write Policy**:
   - The database MUST NEVER be written to, edited, altered, or deleted from.
   - Any query or script must only perform read operations (`find`, `findOne`, `count`, read-only `aggregate`).
2. **Prohibited Methods Across All Languages**:
   - Python (PyMongo/Motor): No `insert_*`, `update_*`, `delete_*`, `drop_*`.
   - Node.js (Mongoose/MongoDB driver): No `save`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`, `drop`.
   - Go / Rust: Read-only query cursors only.
