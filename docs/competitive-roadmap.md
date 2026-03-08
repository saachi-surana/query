# Query -- Competitive Analysis & Product Roadmap

*Generated: March 7, 2026*

---

## Part 1: Query Feature Inventory

### Core Q&A Features
- **Session creation** with auto-generated 6-character join code
- **Session title & description** (description used by AI for better clustering context)
- **Start date & time** scheduling (optional, allows pre-session question collection)
- **Recurring sessions** -- weekly, biweekly, monthly, or custom dates
- **Attendee join** via 6-character code from landing page
- **Question submission** with 500-character limit
- **Anonymous mode** toggle per question
- **Author name** (optional) per question
- **Upvoting / un-upvoting** questions (toggle behavior)
- **Similar question detection** -- as-you-type debounced search suggests existing questions to upvote instead of duplicating
- **Question status tracking** -- pending / answered states
- **Mark / unmark questions as answered** (host controls)

### AI Features (Claude Haiku)
- **AI question clustering** -- automatically groups questions into topic clusters using Claude Haiku
- **AI summary question** per cluster -- generates a single representative question capturing the theme
- **AI cluster summary updates** -- re-summarizes when new questions join a cluster
- **AI auto-suggest answers** -- optional toggle at session creation; drafts 2-3 sentence answers per question
- **AI suggest on demand** -- host can click "AI Suggest" on any individual question
- **AI analytics insights** -- generates trend analysis across sessions (answer rate, engagement, topic patterns)
- **Session description context** -- AI uses session description for smarter clustering

### Host Dashboard (`/session/[code]`)
- **Sidebar navigation** with live / upcoming / past sessions
- **Recurring session grouping** in sidebar with expand/collapse
- **Moderation toggle** -- enable/disable question approval before visibility
- **Pending moderation queue** with approve/reject actions
- **Question management** -- view all questions sorted by upvotes
- **Cluster management** -- view AI-generated topic clusters
- **Mark clusters as answered** (bulk action)
- **Highlight cluster** -- "Discussing Now" feature for presenter mode
- **Threaded replies** -- host can reply to individual questions (auto-marks as answered)
- **Host reply badge** -- replies from host are visually distinguished
- **Copy session code** button
- **Copy join link** button
- **End session** button
- **AI suggest** per question (on-demand)
- **Suggested answer display** with accept/edit capability
- **FAQ library** -- save cluster Q&A pairs for future reference
- **Connection status indicator** (real-time subscription health)

### Attendee View (`/join/[code]`)
- **4-tab interface**: Ask, All, Topics, Mine
- **Ask tab** -- question submission form with name, anonymous toggle, character counter
- **Similar question suggestions** while typing (debounced)
- **Upvote from similar suggestions** (counts as participation, clears form)
- **All tab** -- browse all approved questions sorted by upvotes, with reply threads
- **Topics tab** -- view AI clusters with summary questions, upvote counts, "Discussing Now" highlight
- **Answered topics section** -- collapsed view of resolved clusters
- **Mine tab** -- track personal submissions with status (Pending Review / Pending / Answered)
- **Reply threads** -- attendees can reply to questions
- **Session ended banner** -- read-only mode when session ends
- **Highlighted cluster banner** -- shows "Currently Discussing" topic
- **Connection lost banner** with reconnection status
- **Skeleton loading states** for all views

### Presenter Mode (`/present/[code]`)
- **Full-screen projectable layout** -- designed for screen sharing / projection
- **Large join code display** with URL (Kahoot-style)
- **Highlighted "Discussing Now" cluster** -- prominent animated badge with questions
- **Cluster cards** with question count and upvote totals
- **Individual question cards** with upvote counts
- **Reply thread toggle** per question
- **Unclustered questions section** ("Recent Questions")
- **Empty state** -- large join code prompt when no questions yet
- **Real-time updates** via Supabase subscriptions
- **Stats bar** -- total questions and total upvotes

### Analytics Dashboard (`/analytics`)
- **Overview cards**: Total Sessions, Total Questions, Total Upvotes, Answer Rate %, Avg Engagement Score
- **Questions per session chart** (horizontal bar chart, color-coded by answer rate)
- **Popular topics word cloud** (sized by frequency)
- **AI Insights** -- on-demand trend analysis button
- **Session comparison table**: Session name, Questions, Upvotes, Answer Rate, Engagement Score, Status (Live/Ended)
- **Needs Attention section** -- sessions with low answer rates and top unanswered questions
- **Sidebar** with live/upcoming/past session navigation
- **Recurring series expand/collapse** in sidebar

### Session Report (`/report/[code]`)
- **Summary stats cards**: Total Questions, Answered, Unanswered, Total Upvotes
- **Export CSV** -- downloads all questions with author, upvotes, status, cluster, replies
- **Unanswered questions by cluster** with AI summary
- **Uncategorized unanswered questions**
- **Answered topics** with host replies
- **FAQ Library** display (saved Q&A pairs)
- **Sidebar navigation** (same as analytics)

### Authentication
- **Email/password sign-in** (`/login`)
- **Sign-up flow** (link to `/signup`)
- **Supabase Auth** integration
- **User-linked sessions** (optional -- sessions work without auth too)
- **Auth state listener** for session persistence

### Data Model (Supabase)
- **Sessions**: id, code, title, description, moderation_enabled, auto_suggest, highlighted_cluster_id, ended_at, starts_at, recurrence_type, recurrence_parent_id, recurrence_dates, user_id, created_at
- **Questions**: id, session_id, text, author_name, is_anonymous, cluster_id, status, approved, suggested_answer, upvotes, created_at
- **Clusters**: id, session_id, title, summary_question, status, claimed_by, created_at
- **Replies**: id, question_id, session_id, text, author_name, is_host, created_at
- **FAQ Entries**: id, session_id, cluster_title, summary_question, answer, created_at

### Real-Time Infrastructure
- **Supabase Realtime** subscriptions on sessions, questions, clusters, replies tables
- **postgres_changes** listeners for INSERT, UPDATE, DELETE events
- **Connection status monitoring** with reconnection handling
- **Optimistic UI updates** across all views

### Design & UX
- **Theming system** with CSS custom properties (mesh gradients, primary colors, sidebar styles)
- **Responsive design** -- mobile-first with desktop sidebar
- **Skeleton loading states** across all pages
- **Error handling** with user-friendly messages
- **Mesh gradient headers** (branded, consistent across pages)

---

## Part 2: Competitive Analysis

### 1. Slido (slido.com) -- *Owned by Cisco/Webex*

**Q&A Features:**
- Audience Q&A with anonymous submissions
- Question upvoting and sorting
- Question moderation (approve/reject)
- Q&A highlights and pinning
- Question labels and filtering

**Polling & Interactive Features:**
- Multiple choice polls
- Word clouds
- Rating polls (1-10 scale)
- Open text polls
- Ranking polls (drag & drop prioritization)
- Live quizzes with leaderboards
- Surveys (multi-question, post-event)

**AI Features:**
- AI-generated polls from slide content (one-click)
- AI writing assistant for poll questions and answer options
- AI quiz generation on any topic
- Powered by Azure OpenAI (GPT-3.5/4/4o)
- Available on all plans

**Pricing:**
| Plan | Price | Participants | Key Limits |
|------|-------|-------------|------------|
| Free | $0 | 100 | 3 polls/event, 1 quiz, unlimited Q&A |
| Professional (Biz) | ~$60/mo | 1,000 | Unlimited polls/quizzes/surveys, custom branding, data export |
| Professional (Edu) | ~$7.50/mo | 1,000 | Same as business Professional |
| Enterprise (Biz) | ~$150/mo | 5,000 | SSO, provisioning, org spaces, 3 members |
| Enterprise (Edu) | ~$50/mo | 5,000 | SSO, 5 members |
| One-time Event | From $49 | 200+ | Per-event pricing |

**Key Differentiators:**
- Deep PowerPoint & Google Slides integration (native sidebar)
- Webex/Zoom/Teams integrations
- Enterprise-grade security (SSO, provisioning)
- AI poll generation from slide content
- Per-event pricing for one-off events
- Most recognized brand in the space

---

### 2. Poll Everywhere (polleverywhere.com)

**Q&A Features:**
- Open-ended Q&A
- Upvoting
- Moderation tools (higher tiers)

**Polling & Interactive Features:**
- Multiple choice polls
- Word clouds
- Clickable image polls
- Rankings
- Open-ended responses
- Quizzes with competition mode
- Surveys

**AI Features:**
- AI poll creation from prompts ("Exciting icebreakers", "Quick survey")
- AI-generated question sets

**Pricing:**
| Plan | Price | Participants | Notes |
|------|-------|-------------|-------|
| Free | $0 | 25 | Limited question types |
| Present (Biz) | $10/mo | 700 | Basic interactivity, no branding |
| Engage (Biz) | ~$99/mo | 700+ | Analytics, reporting, moderation |
| Lecture (Edu) | $9/mo | 700 | Same as Present |
| Educator | $16/mo | 700+ | Attendance, grade integration |
| Events Lite | $499/event | Large | One-time events |
| Events Plus | $999+/event | Large | Advanced event features |
| Events Pro | $4,999+/event | Large | Full-service events |

**Key Differentiators:**
- Strongest PowerPoint integration (native add-in)
- Grade book integration for education
- Attendance tracking
- Clickable image responses (unique)
- SMS/text message response option
- Strongest in education market

---

### 3. Mentimeter (mentimeter.com)

**Q&A Features:**
- Audience Q&A with upvoting
- Moderation (Pro plan)
- Anonymous submissions

**Polling & Interactive Features:**
- Multiple choice polls
- Word clouds (with AI grouping)
- Scales (1-10 ratings)
- Rankings
- Open-ended responses
- Quizzes with leaderboards
- Quick Form slides (Pro)
- Content slides (images, headings, text)

**AI Features:**
- AI Menti Builder -- generates full presentation decks from prompts
- AI Grouping -- automatically groups word cloud responses into categories
- AI-powered content suggestions

**Pricing:**
| Plan | Price | Participants | Notes |
|------|-------|-------------|-------|
| Free | $0 | 50/month | Unlimited presentations, most question types |
| Basic (Biz) | $13/mo/presenter | Unlimited | No participant limit, unlimited questions |
| Pro (Biz) | $27/mo/presenter | Unlimited | Custom branding, moderation, team templates |
| Basic (Edu) | $10/mo | Unlimited | Academic pricing |
| Pro (Edu) | $16/mo | Unlimited | Full features for educators |
| Enterprise | Custom | Unlimited | SSO, company branding, success manager |

**Key Differentiators:**
- Most polished presentation-first UX
- AI word cloud grouping (similar to Query's clustering)
- Unlimited participants even on Basic plan
- Zoom and Teams integrations
- Annual billing only (higher commitment)
- Strong design and template library

---

### 4. Pigeonhole Live (pigeonholelive.com)

**Q&A Features:**
- Real-time Q&A with upvoting
- Question filtering and prioritization
- Moderation tools
- Anonymous submissions

**Polling & Interactive Features:**
- Live polls
- Surveys
- Reactions (emoji responses)

**AI Features:**
- No significant AI features documented

**Pricing:**
| Plan | Price | Notes |
|------|-------|-------|
| Free (Basic) | $0 | Limited features, quick start |
| Pro (Meetings) | $8/mo | Unlimited Q&A, polls, surveys, PDF/Excel export |
| Business (Meetings) | $25/mo | Branded, moderation, advanced features |
| Events Basic | $338/event | Per-event |
| Events Premium | $928/event | Full interactive suite, reactions |

**Key Differentiators:**
- Zoom, Teams, Webex native integrations
- Custom branding on lower tier than competitors
- Strong enterprise/event focus
- Data export in PDF and Excel
- Reactions feature (unique)

---

### 5. AhaSlides (ahaslides.com)

**Q&A Features:**
- Live Q&A with upvoting
- Anonymous mode
- Moderation

**Polling & Interactive Features:**
- Multiple choice polls
- Word clouds
- Open-ended questions
- Live quizzes with leaderboards
- Spinner wheel (random selection)
- Rating scales
- Image choice

**AI Features:**
- AI slide generation
- AI quiz creation

**Pricing:**
| Plan | Price | Participants | Notes |
|------|-------|-------------|-------|
| Free | $0 | 50 | 5 quiz Qs, 3 poll Qs per presentation |
| Essential | $4.95/mo | ~200 | More questions, basic features |
| Plus | $10.95/mo | ~500 | Extended features |
| Large | $15.95/mo | ~1000+ | Full feature set |

**Key Differentiators:**
- Most affordable paid plans
- Spinner wheel / gamification features
- Good value for small teams
- Special educator/nonprofit pricing
- Google Slides integration

---

## Part 3: Gap Analysis & Roadmap

### Feature Comparison Matrix

| Feature | Query | Slido | Poll Everywhere | Mentimeter | Pigeonhole | AhaSlides |
|---------|-------|-------|----------------|------------|------------|-----------|
| **Q&A** | | | | | | |
| Live Q&A | Yes | Yes | Yes | Yes | Yes | Yes |
| Upvoting | Yes | Yes | Yes | Yes | Yes | Yes |
| Anonymous questions | Yes | Yes | Yes | Yes | Yes | Yes |
| Question moderation | Yes | Yes | Yes (paid) | Yes (Pro) | Yes | Yes |
| Threaded replies | Yes | No | No | No | No | No |
| **Polling** | | | | | | |
| Multiple choice polls | No | Yes | Yes | Yes | Yes | Yes |
| Word clouds | No | Yes | Yes | Yes | No | Yes |
| Rating/scale polls | No | Yes | Yes | Yes | No | Yes |
| Ranking polls | No | Yes | Yes | Yes | No | No |
| Open text polls | No | Yes | Yes | Yes | No | Yes |
| **Quizzes** | | | | | | |
| Live quiz mode | No | Yes | Yes | Yes | No | Yes |
| Leaderboard | No | Yes | Yes | Yes | No | Yes |
| **AI Features** | | | | | | |
| AI question clustering | Yes | No | No | No | No | No |
| AI summary questions | Yes | No | No | No | No | No |
| AI suggested answers | Yes | No | No | No | No | No |
| AI poll generation | No | Yes | Yes | Yes | No | Yes |
| AI word cloud grouping | No | No | No | Yes | No | No |
| AI analytics insights | Yes | No | No | No | No | No |
| **Sessions** | | | | | | |
| Recurring sessions | Yes | No | No | No | No | No |
| Session scheduling | Yes | Yes | Yes | Yes | Yes | Yes |
| Presenter/projector mode | Yes | Yes | Yes | Yes | Yes | Yes |
| End session / archive | Yes | Yes | Yes | Yes | Yes | Yes |
| **Analytics & Export** | | | | | | |
| Analytics dashboard | Yes | Yes | Yes (paid) | Yes (paid) | Yes | Yes |
| CSV export | Yes | Yes (paid) | Yes (paid) | Yes (paid) | Yes | Yes |
| PDF export | No | Yes | Yes | Yes | Yes | No |
| Session comparison | Yes | No | No | No | No | No |
| **Integrations** | | | | | | |
| PowerPoint plugin | No | Yes | Yes | Yes | No | No |
| Google Slides plugin | No | Yes | No | Yes | No | Yes |
| Zoom integration | No | Yes | No | Yes | Yes | No |
| Microsoft Teams | No | Yes | No | Yes | Yes | No |
| **Infrastructure** | | | | | | |
| Real-time updates | Yes | Yes | Yes | Yes | Yes | Yes |
| QR code for joining | No | Yes | Yes | Yes | Yes | Yes |
| Custom branding | No | Yes (paid) | Yes (paid) | Yes (Pro) | Yes (paid) | Yes (paid) |
| SSO | No | Yes (Enterprise) | Yes (Enterprise) | Yes (Enterprise) | No | No |
| **Auth** | | | | | | |
| Email/password auth | Yes | Yes | Yes | Yes | Yes | Yes |
| Social login (Google) | No | Yes | Yes | Yes | Yes | Yes |
| **Unique to Query** | | | | | | |
| AI clustering of questions | Yes | -- | -- | -- | -- | -- |
| AI summary per cluster | Yes | -- | -- | -- | -- | -- |
| AI suggested answers | Yes | -- | -- | -- | -- | -- |
| Threaded replies | Yes | -- | -- | -- | -- | -- |
| Recurring session series | Yes | -- | -- | -- | -- | -- |
| FAQ library from sessions | Yes | -- | -- | -- | -- | -- |
| Cross-session analytics | Yes | -- | -- | -- | -- | -- |
| Free with no participant cap | Yes | -- | -- | -- | -- | -- |

### Query's Competitive Advantages
1. **AI-first Q&A** -- no competitor does AI clustering, summary questions, or suggested answers
2. **Threaded replies** -- unique; competitors only have flat Q&A
3. **Recurring sessions** -- built-in series management (competitors require manual re-creation)
4. **Cross-session analytics** -- engagement trends and topic analysis across sessions
5. **FAQ library** -- saves institutional knowledge from Q&A sessions
6. **Completely free** -- no participant caps, no feature gates (for now)

---

### Must-Have (High Value, Necessary to Compete)

These are features every major competitor has. Without them, hosts will choose alternatives.

#### 1. Polling -- Multiple Choice
**Why**: Every single competitor has this. Hosts expect to run quick polls alongside Q&A. It is the #1 most-used feature in audience interaction tools.
**Complexity**: Medium (2-3 days)
- New `polls` table (session_id, question, options JSON, type, status)
- New `poll_responses` table (poll_id, user_fingerprint, selected_option)
- Poll creation UI in host dashboard
- Real-time results visualization (bar chart)
- Attendee voting interface
- Presenter mode poll display

#### 2. Word Clouds
**Why**: Slido, Poll Everywhere, Mentimeter, and AhaSlides all have this. Great for brainstorming, icebreakers, and open-ended engagement. Visually impressive on projector.
**Complexity**: Medium (2-3 days)
- Word cloud poll type in polling system
- Real-time word frequency aggregation
- Canvas/SVG word cloud renderer (use `react-wordcloud` or similar)
- Presenter-friendly large display
- Optional: AI grouping of similar words (leverage existing Claude integration)

#### 3. QR Code for Joining
**Why**: Every competitor generates a QR code for the join URL. Critical for in-person events where attendees scan from the projected screen.
**Complexity**: Low (0.5 day)
- Generate QR code from join URL using `qrcode` npm package
- Display on presenter mode, host dashboard, and as downloadable image
- Include alongside the 6-character code on `/present/[code]`

#### 4. Custom Branding (Basic)
**Why**: All paid competitors offer this. Hosts want their company/event logo and colors. Even a basic version (logo upload + primary color) would be differentiating at the free tier.
**Complexity**: Medium (2-3 days)
- Add `logo_url` and `brand_color` fields to sessions table
- Logo upload to Supabase Storage
- Apply brand color to presenter mode, attendee view headers
- Show host logo on join page and presenter mode

#### 5. PDF Report Export
**Why**: Slido, Poll Everywhere, Mentimeter, and Pigeonhole all offer this. Hosts need to share results with stakeholders who were not present.
**Complexity**: Medium (2-3 days)
- Server-side PDF generation (use `@react-pdf/renderer` or `puppeteer`)
- Include: session summary stats, all questions by cluster, answers, upvote counts
- Download button on `/report/[code]` page
- Option to include/exclude unanswered questions

---

### Should-Have (Medium Value, Differentiating)

These would meaningfully improve Query and attract more users, but are not blockers for initial adoption.

#### 6. Yes/No and Rating Polls
**Why**: Quick yes/no and 1-10 scale polls are the second most common poll types after multiple choice. Useful for gauging consensus.
**Complexity**: Low-Medium (1-2 days)
- Add poll types: `yes_no`, `rating` (1-5 or 1-10 scale)
- Simple UI -- button pair for yes/no, slider/stars for rating
- Results: percentage bar for yes/no, average score + distribution for rating

#### 7. Live Quiz Mode
**Why**: Slido, Mentimeter, and AhaSlides all have quizzes with leaderboards. Popular for training, education, and icebreakers. Could leverage existing AI to auto-generate quizzes.
**Complexity**: High (4-5 days)
- Quiz creation flow (questions, correct answers, time limits)
- AI quiz generation from topic/description (use Claude)
- Real-time synchronized question progression
- Score tracking and leaderboard
- Presenter mode quiz display with countdown timer

#### 8. Integrations -- Zoom & Microsoft Teams
**Why**: Pigeonhole, Slido, and Mentimeter all offer this. Remote/hybrid events are a huge use case.
**Complexity**: High (5-7 days per platform)
- Zoom: Zoom Apps SDK, embed Query in Zoom sidebar
- Teams: Microsoft Teams app manifest, tab integration
- Requires app store submissions and review processes
- Consider starting with a simple "embed link" approach before native integration

#### 9. Integrations -- PowerPoint & Google Slides
**Why**: Slido's #1 differentiator. Hosts want to insert Q&A/polls directly into their slide deck.
**Complexity**: Very High (2-3 weeks per platform)
- PowerPoint: Office Add-in (React-based, runs in sidebar)
- Google Slides: Apps Script add-on
- Complex API and approval processes
- Consider as a v2 feature after core product is stable

#### 10. Email Notifications
**Why**: Hosts want to be notified when new questions come in or when a session gets high engagement. Attendees may want a follow-up email with answers.
**Complexity**: Medium (2-3 days)
- Transactional email service (Resend, SendGrid, or Supabase Edge Functions)
- Host: new question digest, session summary after end
- Attendee: optional follow-up email with answers to their questions
- Unsubscribe mechanism

#### 11. Analytics Export (PDF Report)
Already covered in Must-Have #5 above.

#### 12. Rate Limiting / Spam Protection
**Why**: Any public-facing Q&A tool will attract spam, especially from anonymous users. Competitors have moderation but also behind-the-scenes rate limiting.
**Complexity**: Medium (1-2 days)
- API route rate limiting (use `next-rate-limit` or Vercel Edge middleware)
- Per-IP throttling on question submission (e.g., max 5 questions per minute)
- Per-session throttling on upvotes
- Optional CAPTCHA for anonymous submissions
- Profanity filter (basic word list or AI-based)

#### 13. Social Login (Google, GitHub)
**Why**: Reduces friction for host sign-up. Supabase Auth supports this out of the box.
**Complexity**: Low (0.5-1 day)
- Enable Google OAuth in Supabase dashboard
- Add "Sign in with Google" button to login/signup pages
- Optional: GitHub OAuth for developer-focused events

---

### Could-Have (Low Priority, Future)

#### 14. PWA / Installable Web App
**Why**: Attendees at recurring events could "install" Query on their phone home screen for quick access. Better than asking them to bookmark a URL.
**Complexity**: Low-Medium (1-2 days)
- See PWA section below for details.

#### 15. Native Mobile App
**Why**: Some enterprise customers prefer native apps. But PWA covers 90% of the use case.
**Complexity**: Very High (months)
- React Native or Expo for cross-platform
- Significant ongoing maintenance burden
- Recommend PWA first, native only if strong enterprise demand

#### 16. API for Third-Party Integrations
**Why**: Allows developers to build custom integrations (e.g., Slack bot that posts new questions, CRM integration).
**Complexity**: Medium (3-5 days)
- RESTful API with API key authentication
- Endpoints: sessions, questions, clusters, polls
- Webhook support for real-time events
- API documentation (OpenAPI/Swagger)

#### 17. Webhooks
**Why**: Enables real-time integration with external systems without polling.
**Complexity**: Medium (2-3 days)
- Webhook registration per session or per account
- Events: question.created, question.answered, session.ended, poll.completed
- Retry logic with exponential backoff
- Webhook secret for signature verification

#### 18. White-Label Solution
**Why**: Enterprise customers may want to run Query under their own brand entirely.
**Complexity**: High (1-2 weeks)
- Full theme customization (colors, fonts, logo, favicon)
- Custom domain support (CNAME)
- Remove all Query branding
- Separate pricing tier

#### 19. Surveys (Multi-Question Forms)
**Why**: Post-event feedback collection. Slido and Pigeonhole have this.
**Complexity**: Medium (3-4 days)
- Multi-question form builder
- Question types: multiple choice, open text, rating, NPS
- Response collection and summary
- Export results

#### 20. Spinner Wheel / Gamification
**Why**: AhaSlides has this. Fun for selecting random participants or questions.
**Complexity**: Low (1-2 days)
- Animated wheel component
- Feed from attendee names or questions
- Presenter mode display

---

### Security & Hosting Roadmap

#### 1. Hosting (Recommended: Vercel)
**Recommendation**: **Vercel** is the optimal choice for a Next.js application.
- Native Next.js support (built by the same team)
- Automatic Edge network CDN
- Serverless API routes out of the box
- Preview deployments for PRs
- Free tier generous for initial launch
- Easy upgrade to Pro ($20/mo) for production
- **Alternative**: AWS Amplify or Railway if more infrastructure control is needed

#### 2. Custom Domain Setup
- Purchase domain (e.g., `queryapp.live`, `getquery.com`)
- Add to Vercel project settings (DNS CNAME/A records)
- Vercel handles SSL certificate provisioning automatically
- Set up `www` redirect to apex domain
- **Estimated time**: 1 hour (plus DNS propagation)

#### 3. SSL/HTTPS
- **Automatic with Vercel** -- zero configuration needed
- Let's Encrypt certificates auto-provisioned and auto-renewed
- HTTP to HTTPS redirect enabled by default
- HSTS headers recommended

#### 4. Rate Limiting on API Routes
- **Vercel Edge Middleware** for global rate limiting
- Per-route limits:
  - `/api/cluster` -- 10 req/min per IP (AI calls are expensive)
  - `/api/suggest-answer` -- 5 req/min per IP
  - Question submission -- 10 req/min per IP
  - Upvotes -- 30 req/min per IP
- Use `@upstash/ratelimit` with Redis for distributed rate limiting
- Return `429 Too Many Requests` with `Retry-After` header

#### 5. Input Sanitization (XSS Prevention)
- React already escapes HTML in JSX by default (good baseline)
- Add server-side sanitization on API routes using `sanitize-html` or `DOMPurify`
- Sanitize: question text, author names, reply text, session titles
- Content Security Policy (CSP) headers via `next.config.js`
- Validate and sanitize all user inputs before database insertion

#### 6. CORS Configuration
- Configure in `next.config.js` or middleware
- Restrict to known origins in production (your domain only)
- Supabase has its own CORS settings (configure in dashboard)
- API routes should only accept requests from your frontend origin

#### 7. Environment Variable Management
- Use Vercel's Environment Variables UI (encrypted at rest)
- Separate variables for Production, Preview, Development
- Critical secrets: `ANTHROPIC_API_KEY`, Supabase keys, auth secrets
- Never commit `.env` files to git (already in `.gitignore`)
- Use `NEXT_PUBLIC_` prefix only for client-safe variables
- Rotate API keys periodically

#### 8. Database Backups
- **Supabase** provides automatic daily backups on Pro plan ($25/mo)
- Point-in-time recovery available on Pro plan
- Manual backups: scheduled `pg_dump` via cron
- Consider separate read replica for analytics queries
- Test restore procedure quarterly

#### 9. Error Monitoring
- **Recommended**: **Sentry** (free tier: 5K errors/month)
  - `@sentry/nextjs` package for automatic setup
  - Captures client-side and server-side errors
  - Source maps for production debugging
  - Performance monitoring
- Alternative: LogRocket (adds session replay), Axiom (for logs)
- Set up Slack/email alerts for error spikes

#### 10. Analytics
- **Vercel Analytics** (built-in, $10/mo for Pro features)
  - Web Vitals, page views, visitor demographics
- **PostHog** (recommended for product analytics, generous free tier)
  - Event tracking: session created, question asked, poll voted
  - Funnels: landing -> create -> first question
  - Feature flags for gradual rollouts
  - Session recordings for UX debugging
- Alternative: Mixpanel, Amplitude

#### 11. GDPR / Privacy Considerations
- **Data minimization**: Only collect what is needed (already good -- optional names, anonymous mode)
- **Data retention policy**: Define how long session data is kept (e.g., 90 days for free, unlimited for paid)
- **Right to deletion**: Ability for users to request data deletion
- **Cookie consent**: Add consent banner if using analytics cookies
- **Privacy policy page**: Required; describe what data is collected, how it is used, who processes it
- **Data processing agreement**: If using Supabase (EU region available), Anthropic (review DPA)
- **Sub-processors list**: Supabase, Anthropic, Vercel, Sentry

#### 12. Terms of Service / Privacy Policy Pages
- Create `/terms` and `/privacy` pages
- Cover: acceptable use, content ownership, liability limitations
- Reference AI processing (questions are sent to Anthropic for clustering)
- Inform users that anonymous questions are not truly anonymous to the host (they can see IP-based patterns)
- Add footer links across all pages
- **Recommended**: Use a legal template service (e.g., Termly, iubenda) then customize

---

### PWA / Mobile App Notes

#### What Would It Take to Make Query a PWA?

A Progressive Web App would allow attendees and hosts to "install" Query on their phone or desktop, getting an app-like experience without an app store.

#### Steps to Implement

1. **`manifest.json`** (or `manifest.webmanifest`)
   - App name: "Query"
   - Short name: "Query"
   - Theme color, background color (match brand)
   - Icons: 192x192 and 512x512 PNG
   - Display: `standalone`
   - Start URL: `/`
   - Place in `/public/manifest.json`
   - Reference in `<head>` via `app/layout.tsx`

2. **Service Worker**
   - Use `next-pwa` package (wraps Workbox)
   - Cache strategy: Network-first for API calls, Cache-first for static assets
   - Offline fallback page: "You're offline. Reconnecting..."
   - Do NOT cache real-time data (questions, polls) -- only cache shell and static assets
   - Pre-cache: landing page, join page shell, static assets

3. **Installability**
   - With manifest + service worker + HTTPS, browsers will show "Install" prompt
   - Add custom install banner/button for better UX
   - iOS: "Add to Home Screen" instruction overlay (Safari does not auto-prompt)

4. **Push Notifications** (optional, future)
   - Web Push API for notifying hosts of new questions
   - Requires notification permission prompt
   - Use Supabase Edge Functions or a service like OneSignal

#### Benefits vs Native App

| Aspect | PWA | Native App |
|--------|-----|-----------|
| Development time | 1-2 days | 2-4 months |
| Maintenance | Same codebase | Separate codebase |
| Distribution | No app store needed | App Store + Play Store review |
| Offline support | Basic (shell caching) | Full |
| Push notifications | Yes (limited on iOS) | Full |
| Hardware access | Limited | Full (camera, etc.) |
| Install friction | Very low | Medium (download) |
| Updates | Instant | Store review cycle |

#### Timeline Estimate
- **Basic PWA** (manifest + service worker + offline shell): **1-2 days**
- **Enhanced PWA** (install prompts, iOS guidance, offline page): **+1 day**
- **Push Notifications**: **+2-3 days**
- **Total**: 3-5 days for a complete PWA experience

#### Recommendation
Start with PWA. It covers the primary use case (attendees saving the app to their home screen for repeat events) with minimal effort. Native app is only worth considering if enterprise customers specifically demand it or if push notification reliability on iOS becomes a hard requirement.

---

### Prioritized Implementation Roadmap

#### Phase 1: Competitive Parity (Weeks 1-2)
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | QR code for joining | 0.5 day | High -- every event needs this |
| 2 | Multiple choice polls | 2-3 days | Critical -- table stakes |
| 3 | Word clouds | 2-3 days | High -- visually impressive |
| 4 | PDF report export | 2-3 days | High -- stakeholder sharing |
| 5 | Rate limiting | 1-2 days | High -- security baseline |

#### Phase 2: Differentiation (Weeks 3-4)
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 6 | Yes/No and rating polls | 1-2 days | Medium |
| 7 | PWA setup | 1-2 days | Medium -- repeat attendees |
| 8 | Basic custom branding | 2-3 days | Medium-High |
| 9 | Social login (Google) | 0.5-1 day | Medium |
| 10 | Input sanitization hardening | 1 day | High -- security |

#### Phase 3: Growth Features (Weeks 5-8)
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 11 | Live quiz mode | 4-5 days | High -- education/training |
| 12 | Email notifications | 2-3 days | Medium |
| 13 | Surveys (post-event forms) | 3-4 days | Medium |
| 14 | API + webhooks | 4-5 days | Medium -- developer ecosystem |
| 15 | Spam protection (CAPTCHA, filters) | 1-2 days | Medium |

#### Phase 4: Enterprise & Integrations (Weeks 9-16)
| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 16 | Zoom integration | 5-7 days | High |
| 17 | Microsoft Teams integration | 5-7 days | High |
| 18 | PowerPoint add-in | 2-3 weeks | Very High |
| 19 | Google Slides add-on | 2-3 weeks | High |
| 20 | SSO / enterprise auth | 3-5 days | High for enterprise |
| 21 | White-label option | 1-2 weeks | Medium |
| 22 | Terms of service + privacy policy | 1-2 days | Required for launch |

---

### Summary

**Query's unique position**: Query is the only tool in this space with AI-powered question clustering, AI summary questions, and AI suggested answers. Combined with threaded replies, recurring sessions, and cross-session analytics, Query has a genuinely differentiated product for the Q&A use case.

**Biggest gaps**: The lack of polling (multiple choice, word clouds, ratings) and QR codes are the most visible competitive gaps. These are table-stakes features that every competitor offers.

**Recommended strategy**: Close the must-have gaps quickly (polling, QR codes, PDF export), then lean into the AI differentiation with quiz generation and smarter analytics. Integrations (Zoom, Teams, PowerPoint) are the long-term play for enterprise adoption.

**Pricing consideration**: Query is currently 100% free with no caps. When introducing pricing, consider keeping the free tier generous (unlimited Q&A, basic polls, 100 participants) and charging for AI features, branding, export, and higher participant limits -- similar to Slido's model but with better free-tier AI.
