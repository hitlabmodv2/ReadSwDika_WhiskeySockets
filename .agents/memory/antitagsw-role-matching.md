---
name: AntiTagSW participant role matching
description: AntiTagSW must identify admins and kick targets across WhatsApp PN and LID participant formats
---
AntiTagSW participant records are not consistent: the same account may appear through `id`, `jid`, `phoneNumber`, or `lid`, and incoming messages may use an `@lid` JID. Role checks must compare all available participant identifiers; removal should prefer the participant phone JID when available.

**Why:** Matching only one participant field caused admins to be treated as ordinary members and caused kick requests to use an unusable LID target.

**How to apply:** When changing AntiTagSW metadata handling, preserve multi-field role matching and the phone-JID preference for `groupParticipantsUpdate`.