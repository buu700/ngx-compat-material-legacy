# Contributing

Use the pinned supported toolchain and lockfile. Work in small reviewable changes and preserve historical source attribution. A patch includes a minimal reproducer or contract test, packed-consumer evidence when package/Sass exports change, and updated API/delegation/provenance records. New upstream dependencies must be stable public APIs and must pass the deprecation/future-removal policy checks.

Do not “fix” tests by deleting historical behavior, masking selectors, sorting CSS or regenerating reference goldens. Explain any observable correction with exact scope and approval. Offer generally relevant fixes upstream where appropriate; do not import unrelated modernization.

Security reports follow SECURITY.md. A passing AI review is not an audit certification. Community work is welcome but no response-time promise is implied.
