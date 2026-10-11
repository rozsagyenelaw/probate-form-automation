#!/bin/bash
# Copies the client-step wording (single source of truth) into the portal Cloud Functions.
# Usage: scripts/sync-client-steps.sh <portal worktree>
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)/lib/formgen/clientSteps.js"
DST="${1:?portal worktree}/functions/formsSteps/clientStepsContent.js"
{ echo "// GENERATED COPY of probate-form-automation lib/formgen/clientSteps.js (scripts/sync-client-steps.sh). Edit there, not here."; cat "$SRC"; } > "$DST"
echo "synced $DST"
