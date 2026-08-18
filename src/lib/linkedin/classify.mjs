// Turns a LinkedIn notification e-mail (subject + optional snippet) into an engagement signal.
// Pure — no I/O — so the patterns can be tested against real subjects without Gmail.
//
// LinkedIn only sends these mails; it exposes no read API for our own posts' reactions to an app
// holding just w_member_social. So this classifier IS the read path. Keep it conservative: an
// unrecognised subject returns null and is simply skipped, never guessed.
//
// Names come out of the subject line ("Ana Pop reacted to your post"). LinkedIn aggregates when
// several people act ("Ana Pop and 3 others liked ..."), so `authorName` may legitimately carry
// that phrasing — we keep it verbatim rather than invent 3 rows for people we can't name.

const RULES = [
  // Kind first, then the regex that captures the name (group 1). Order matters — "commented" must
  // be checked before the generic "reacted"; "accepted your invitation" before plain "invitation".
  ['comment',             /^(.+?) (?:commented on|replied to) your (?:post|comment)/i],
  ['comment',             /^(.+?) a comentat/i],
  ['reaction',            /^(.+?) (?:reacted to|liked|celebrated|loves|found .* insightful on|supported) your (?:post|comment|article)/i],
  ['reaction',            /^(.+?) (?:a apreciat|a reacționat)/i],
  ['share',               /^(.+?) (?:shared|reposted) your (?:post|article)/i],
  ['message',             /^(.+?) sent you a message/i],
  ['message',             /^(?:new message|message) from (.+)$/i],
  ['invitation_accepted', /^(.+?) accepted your invitation/i],
  ['profile_view',        /^(.+?) viewed your profile/i],
  ['invitation',          /^you have (\d+) new invitations?/i],
]

const NOISE = [
  /verify your new device/i, /is popular in your network/i, /opportunities may be available/i,
  /spotlights/i, /^[^,]+, meet /i, /jobs? (for you|alert)/i, /newsletter/i, /^your weekly/i, /security/i,
]

export function classifyLinkedInMail({ subject = '', snippet = '' } = {}) {
  const s = subject.trim()
  if (!s || NOISE.some((re) => re.test(s))) return null
  for (const [kind, re] of RULES) {
    const m = s.match(re)
    if (!m) continue
    if (kind === 'invitation') {
      // "You have 2 new invitations" names nobody; the count is the only fact we have.
      return { kind, authorName: `${m[1]} new invitation${m[1] === '1' ? '' : 's'}`, content: null }
    }
    const name = m[1].replace(/\s+/g, ' ').trim()
    if (!name || name.length > 120) return null
    return { kind, authorName: name, content: snippet ? snippet.slice(0, 500) : null }
  }
  return null
}
