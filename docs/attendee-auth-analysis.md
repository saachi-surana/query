# Attendee Authentication & Pre-Polling Analysis

## Current State

### How Attendees Are Identified Today

Attendees have **no identity system whatsoever**. The join page (`app/join/[code]/page.tsx`) works as follows:

- Attendees enter a session by navigating to `/join/{CODE}` — no login, no account, no cookie.
- When submitting a question, they optionally provide a **name** (free-text input) or check **"Ask anonymously"**.
- The `author_name` field is stored on the `questions` table as a nullable string. There is no `user_id` or persistent identifier on questions.
- The `is_anonymous` boolean controls display, but even non-anonymous questions are just a name string — there is no verified identity behind it.

### How "My Questions" Works

The "Mine" tab exists (tab state `'mine'`) and tracks questions via **in-memory React state only**:

```typescript
const [myQuestionIds, setMyQuestionIds] = useState<Set<string>>(new Set())
```

After a successful question submission, the newly created question ID is added to `myQuestionIds`. This set is:

- **Not persisted** — it lives only in component state.
- **Lost on page refresh** — refreshing the browser clears the "Mine" tab completely.
- **Not stored in localStorage, sessionStorage, or cookies** — grep confirms zero usage of any browser storage API across the codebase.
- **Not tied to any user account** — there is no attendee auth.

This means the "My Questions" feature is effectively broken for any real use case. It only works within a single uninterrupted browser session.

### How Upvotes Work

Upvotes use the same pattern — `upvotedIds` is an in-memory `Set<string>`. An attendee who refreshes the page can upvote the same question again. There is no server-side deduplication.

### What Works Now

- Frictionless joining: enter a code, start asking questions immediately.
- Optional name field provides lightweight attribution.
- Anonymous mode is a first-class feature.
- Real-time updates via Supabase subscriptions work well.
- Moderation (approve/reject) is functional.
- Similarity detection helps reduce duplicate questions.

### What Is Missing

1. **No persistent attendee identity** — "My Questions" is lost on refresh.
2. **No upvote deduplication** — same person can upvote repeatedly.
3. **No way to return to a session** and see your previously submitted questions.
4. **No email notifications** when questions are answered.
5. **No cross-device continuity** — asked a question on your phone, cannot see it on your laptop.

---

## Pre-Polling Analysis

### Is Pre-Polling Implemented?

**Partially, but the critical attendee-side gating is missing.**

Here is what exists:

1. **`starts_at` field** — The `Session` type includes `starts_at: string | null`. Hosts can set a start date and time when creating a session (`app/create/page.tsx`, line 76). The UI even includes helper text: *"Collect questions before the session starts."*

2. **Analytics/sidebar awareness** — The analytics page and session sidebar correctly distinguish between "live" and "upcoming" sessions:
   ```typescript
   const liveSessions = sessions.filter((s) => !s.ended_at && (!s.starts_at || new Date(s.starts_at) <= new Date()))
   const upcomingSessions = sessions.filter((s) => s.starts_at && new Date(s.starts_at) > new Date() && !s.ended_at)
   ```

3. **Join page does NOT check `starts_at`** — The attendee join page loads the session and immediately allows question submission. There is no check like `if (new Date() < new Date(session.starts_at))`. Attendees can submit questions at any time, whether the session has "started" or not.

### What This Means

Pre-polling **accidentally works** in the current implementation. If a host sets `starts_at` to a future date and shares the join code early, attendees can submit and upvote questions before the session begins. However:

- There is **no visual distinction** between pre-polling mode and live mode on the attendee side.
- There is no countdown or "session starts in X hours" indicator.
- The host dashboard does not differentiate pre-submitted questions from live ones.
- There is no way to "lock" submissions after a session ends (the `ended_at` check only hides the Ask tab form, not the All/Topics/Mine tabs — which is correct behavior).

### What Full Pre-Polling Would Look Like

1. **Attendee-side awareness**: Show a banner like "Session starts March 15 at 2:00 PM — submit your questions early!" when `starts_at` is in the future.
2. **Optional pre-poll locking**: Host setting to allow/disallow early submissions.
3. **Question persistence**: Attendees who submit pre-poll questions should be able to return and see them — which requires some form of identity persistence (even just localStorage).
4. **Host-side pre-poll summary**: Before going live, show hosts a summary of pre-submitted questions, top topics, and question count.

### Does Pre-Polling Require Attendee Auth?

**Not necessarily.** Pre-polling can work without auth if we add localStorage-based identity (a random UUID stored in the browser). This would solve the "return to see my questions" use case for pre-polling without adding login friction. Full auth (email/password) is only needed for cross-device continuity and email notifications.

---

## Competitive Landscape

### Slido (owned by Cisco/Webex)

- **Default: No login required.** Participants join with just an event code. No account needed.
- **Optional auth**: Hosts can require name, email, passcode, or SSO (Google, SAML, Webex) — but this is opt-in and typically only used in corporate/enterprise settings.
- **Pre-event questions**: Fully supported. Hosts share the event code early, and participants can post and upvote questions before the event. The event just needs to be "active" (paid plans allow up to 1 year of activity).
- **Anonymous participation**: Supported. Hosts can choose between anonymous or named participation modes.
- **Identity tracking**: When email auth is enabled, Slido sends a verification code on repeat visits to recognize returning participants.

**Sources:**
- [Restrict participant access to your slido](https://community.slido.com/setting-up-a-slido-82/restrict-participant-access-to-your-slido-630)
- [Participant Privacy: Choose anonymous or named participation](https://community.slido.com/setting-up-a-slido-82/participant-privacy-choose-anonymous-or-named-participation-1609)
- [Collect Q&A questions before your meeting or event](https://community.slido.com/running-a-slido-81/collect-q-a-questions-before-your-meeting-or-event-402)

### Poll Everywhere

- **Default: No login required** for basic polling.
- **Optional registration**: Presenters can require participants to register (common in higher education for grade tracking). Registration can happen via a link sent before the session or at join time.
- **Use case driven**: Education deployments often require auth (for grading); corporate events typically do not.

**Sources:**
- [Secure Your Polls with Registered Participants](https://www.polleverywhere.com/features/participants)
- [Participant registration](https://support.polleverywhere.com/hc/en-us/articles/1260801547010-Participant-registration)

### Mentimeter

- **Default: No login required.** Participants join via menti.com with just a code.
- **Optional "Verified Participants"**: Enterprise-only feature. Hosts can require login via SSO before joining. This verifies identity but does not automatically link responses to identities — that requires separately enabling "Participant names."
- **Anonymous by default**: Core design principle. Anonymity drives participation.

**Sources:**
- [How to use Verified Participants](https://help.mentimeter.com/en/articles/10205219-how-to-use-verified-participants)
- [Joining a Menti as a logged in user](https://help.mentimeter.com/en/articles/10205259-joining-a-menti-as-a-logged-in-user-verified-participants)

### Industry Pattern Summary

| Feature | Slido | Poll Everywhere | Mentimeter | Query (current) |
|---|---|---|---|---|
| Login required by default | No | No | No | No |
| Optional auth for hosts to enable | Yes (enterprise) | Yes | Yes (enterprise) | No |
| Pre-event questions | Yes | Limited | No | Accidentally works |
| Anonymous participation | Yes | Yes | Yes (default) | Yes |
| Persistent "my questions" | Via email auth | Via registration | No | No (in-memory only) |

**Key takeaway**: Every major competitor defaults to zero-friction anonymous access. Auth is always optional and host-controlled, never required for participants.

---

## Attendee Auth: Pros vs Cons

### Arguments FOR Attendee Login

1. **Persistent question history across devices** — Submit on phone, check status on laptop.
2. **Pre-polling tied to identity** — Return days later to see your pre-submitted questions and their status.
3. **Email notifications** — "Your question was answered!" opens a powerful engagement loop.
4. **Upvote deduplication** — Server-side enforcement of one-upvote-per-person.
5. **Return to session** — Close the browser, come back later, see your full context.
6. **Spam prevention** — Harder to flood a session with low-quality questions when identity is tracked.
7. **Host analytics** — "42 unique participants asked 87 questions" is more meaningful than "87 questions were submitted."

### Arguments AGAINST Attendee Login

1. **Friction kills participation** — This is the single biggest risk. Every additional step between "I have a question" and "I submitted it" reduces participation. In live Q&A, the audience is already somewhat reluctant to ask; adding a login wall compounds this.
2. **Industry standard is no-auth** — Slido, Mentimeter, and Poll Everywhere all default to no login. Requiring it would put Query at a competitive disadvantage for adoption.
3. **Anonymous questions are a core feature** — Many of the best questions at Q&A sessions are ones people would not ask if their name were attached. Auth (even optional) can create a chilling effect.
4. **Session codes already provide access control** — Only people with the code can join. This is sufficient for most use cases.
5. **Most attendees are one-time participants** — They attend one session, ask 1-2 questions, and never return. Building an auth system for this audience has a poor effort-to-value ratio.
6. **Password fatigue** — People are tired of creating accounts. Even "sign in with Google" adds cognitive load.
7. **Mobile-first audience** — Many attendees join from phones during a live event. Typing credentials on a phone during a talk is a poor experience.

---

## Recommendation

### Do NOT add mandatory attendee auth. Instead, implement a layered identity system.

The recommendation is a three-tier approach, ordered by implementation priority:

#### Tier 1: localStorage-based anonymous identity (implement now)

Generate a random UUID (`attendee_id`) on first visit and store it in `localStorage`. Use this to:

- **Persist "My Questions"** across page refreshes within the same browser.
- **Deduplicate upvotes** server-side (store `attendee_id` on upvote records).
- **Enable pre-polling return visits** — attendee returns to the same browser, sees their questions.
- **Zero friction** — no UI change, no login prompt, completely invisible to the user.

This solves 80% of the identity problems with 0% additional friction.

#### Tier 2: Optional "Claim your questions" flow (implement later)

After submitting a question, show a subtle prompt: *"Want to get notified when this is answered? Enter your email."* This:

- Links the localStorage identity to an email address.
- Enables email notifications for answered questions.
- Does NOT require a password or account creation.
- Is completely optional — skip it and stay anonymous.
- Can use a magic-link for verification if needed later.

#### Tier 3: Host-controlled required auth (enterprise feature, future)

Allow hosts to toggle "Require participant email" or "Require SSO" on a per-session basis. This matches the Slido/Mentimeter enterprise model and is only needed for corporate/compliance use cases.

### Why This Approach

- **Tier 1 alone** fixes the immediate UX problems (broken "My Questions", duplicate upvotes) with zero friction cost.
- **Tier 2** adds meaningful value (notifications) without creating barriers.
- **Tier 3** unlocks enterprise sales without forcing the feature on casual users.

This is exactly what the competitors do: anonymous by default, identity as an optional layer.

---

## If We DO Add Attendee Auth: Minimal Implementation

### Tier 1 (localStorage identity) — Low complexity

**Pages that change:**
- `app/join/[code]/page.tsx` — Generate/read `attendee_id` from localStorage on mount. Pass it when creating questions and upvotes. Filter "My Questions" by `attendee_id` from DB instead of in-memory set.

**DB changes:**
- Add `attendee_id` column (nullable UUID) to `questions` table.
- Create `upvotes` table: `id`, `question_id`, `attendee_id`, `created_at` with a unique constraint on `(question_id, attendee_id)`.
- Remove `upvotes` integer column from `questions` (replace with COUNT from upvotes table, or keep as a denormalized count updated via trigger).

**Interaction with host auth:**
- None. This is completely independent of the Supabase Auth system used for hosts.

**Estimated complexity:** 1-2 days of work.

### Tier 2 (optional email claim) — Medium complexity

**Additional pages that change:**
- `app/join/[code]/page.tsx` — Add optional email input after question submission.
- New: email notification system (could be a Supabase Edge Function or external service).

**Additional DB changes:**
- Create `attendees` table: `id` (UUID, matches localStorage), `email` (nullable), `created_at`.
- Add foreign key from `questions.attendee_id` to `attendees.id`.

**Interaction with host auth:**
- Still independent. Attendees are NOT Supabase Auth users. They are tracked in a separate `attendees` table. This avoids polluting the auth.users table with potentially millions of one-time participants.

**Estimated complexity:** 3-5 days (including email service integration).

### Tier 3 (host-controlled required auth) — Higher complexity

**Additional changes:**
- Add `require_participant_auth` boolean to `sessions` table.
- Add auth gate on join page that checks this flag.
- Integrate with Supabase Auth or external SSO for participant login.
- Significant UX work for the login flow on mobile.

**Interaction with host auth:**
- Now overlaps with the existing Supabase Auth system. Need to decide whether attendees use the same auth system as hosts or a separate one. Recommendation: separate system (magic links only, no passwords) to keep it lightweight.

**Estimated complexity:** 1-2 weeks.
