// A read-only entry is complete once it is read: reacted=false is expected,
// not pending work. Keep startup and live retry selection on this same rule.
export function isSwEntryPending(entry, reactionEnabled = true) {
  if (!entry || entry.deleted) return false;
  if (!entry.read) return true;
  // A read-only story is complete even after Read+Reaction is enabled later.
  // Only retry a missing reaction when the tracker explicitly recorded that
  // reactions were expected for this story; legacy entries have no mode data.
  return reactionEnabled && !entry.reacted && entry.reactionExpected === true;
}