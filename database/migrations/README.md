# Database migrations

- Production schema changes are applied only through timestamped migration files in this directory.
- Never edit, rename, or delete a migration that has been applied to any shared environment.
- Never call Sequelize `sync()`, `sync({ alter: true })`, or `sync({ force: true })` in application code.
- Additive nullable fields may be introduced directly. New required fields must use separate expand/backfill/contract migrations.
- Review generated SQL behavior against `homeAssistantDB_test` before release.
- Deployment runs the compiled migration files before switching the `current` release symlink.
- `202608260001-initialize-auth` is the only migration allowed to discard legacy tables, and only when `ALLOW_LEGACY_RESET=1`.
