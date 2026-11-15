# Handoff validation

The clone-contained handoff was tested at `8c54f93b7` on 2026-11-15. The follow-up validation commit changes only this result document and its JSON record. These checks validate transport and continuation inputs; application/source/runtime qualification was not rerun.

A disposable bare origin exposed only the actual public branch/tag histories plus the corrected main tip. A fresh `git clone --no-local` copied history through Git transport, with no shared object directory, hardlinked objects or alternates in the receiving clone. It initially lacked exactly the 17 supplemental commits. From that clone alone, the documented durable-copy, payload verification, restore, bundle verification/import and history verification procedure passed:

- 628 regular payload files, 36,508,948 bytes, and all 22 pending-packet hash/size bindings verified.
- Every restored file was hashed again; a corrupt payload was rejected before creating a destination, and an existing destination was refused.
- All 2,663 referenced available commit IDs and 205,109 reachable objects were present after importing the included 126,153-byte supplemental bundle. The verifier disables Git network protocols; no missing object was silently acquired.
- The receiving checkout remained clean. Changes since product stopping point c3 were confined to this handoff directory, and the deletion commit was absent from current branch ancestry.
- Top-level handoff Markdown links resolved. All named packets and their declared document companions were present; receipt review also recovered the NativeDate source-cut/admission files and three Sass control logs omitted from the first selection.

See [CLONE-VALIDATION.json](CLONE-VALIDATION.json) for the tested source identity and counts. The payload manifest is authoritative for delivered files. The earlier external transfer kit and its add/delete instructions are superseded; neither is needed by the receiver.

No pending patch was applied and no payload program was executed during transport verification. The original c3 inventory regression and dirty-artifact diagnostics retain their historical scope. Copied-byte and Git-object checks do not establish compatibility, security, G02/G11, clean-artifact, audit or release approval. Private consumer reports, credentials, browser profiles and installed runtime dependencies were not included; required fresh consumer checks need authorized access.
