# Neon preparation — 13 October 2026

Prisma schemas and guarded migrations are prepared. The existing runtime storage remains unchanged until this project's own Neon URL is assigned and its PostgreSQL runtime integration is completed and tested.

Add DATABASE_URL and matching DIRECT_URL only to the private .env. Each project needs its own verified database target.

Run these commands from this project folder:

```powershell
npm.cmd run db:tools:install
npm.cmd run db:import:preview
npm.cmd run db:migrate:deploy
npm.cmd run db:migrate:status
npm.cmd run db:import:neon
```

The migration guard refuses endpoints assigned to other apps, unexpected tables, unfinished migrations and destructive SQL. Existing unidentified tables need a reviewed baseline. The importer backs up source/remote data, refuses conflicting rows and never resets a database.

Migration tooling lives separately in migration-tools/. Application dependencies and current UI behavior are preserved. No database connection, remote migration, runtime conversion or deployment has occurred for this pending project.

The full inventory and handover is in D:/Project/Mypersonal-portfolio/docs/NEON-HANDOVER-2026-10-13.md.