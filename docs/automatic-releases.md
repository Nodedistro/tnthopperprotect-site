# Automatic Modrinth announcements

The Publish Modrinth releases GitHub Actions workflow checks about every 15 minutes
(GitHub may delay scheduled runs). It reads listed stable releases from the public
Modrinth API and calls the existing AWS admin publishing endpoint. That endpoint
saves the website update and sends the configured Discord announcement.

## Activate

In repository Settings → Secrets and variables → Actions, add a repository secret
named RELEASE_PUBLISH_SECRET with the same value as the Lambda ADMIN_SECRET.
Never put that value in frontend code or commit it. No Modrinth token is required.
Then run Publish Modrinth releases manually with dry_run enabled to preview,
and disabled to publish. Subsequent scheduled runs publish automatically.

The workflow must be present on the default branch. GitHub can disable schedules
in inactive public repositories after 60 days; re-enable the workflow if needed.

## Existing announcements and duplicate protection

The four releases already announced by the owner are explicitly baselined:
pXERzcGT, mnWOmlkS, iJS8ITi0, YNocNPqq. They will not be announced again.
Other releases are compared by Modrinth version ID in existing website download
links, not by version number (different loaders can share a version number).
All runs of this workflow share a concurrency group. Do not manually publish the
same new release while the sync is posting it. Existing manual publishing remains available.

The backend is not in this repository as a deployable Lambda artifact, so this
workflow uses its existing HTTP contract rather than changing Lambda or Supabase.
No backend redeployment or frontend rebuild is required.

## Failures

API errors fail the run. A subsequent run checks stored update links before
posting, so an ambiguous prior HTTP response is normally deduplicated.
This is not an exactly-once transaction across website storage and Discord.
If the website save succeeds but Discord fails, the run fails with the release ID;
check backend logs and send that Discord announcement manually. The workflow
does not repost the website record merely to retry Discord. Subscribe to GitHub
Actions failure notifications to see such failures.

Dry run: node scripts/sync-modrinth.cjs --dry-run
Tests: node --test scripts/sync-modrinth.test.cjs
