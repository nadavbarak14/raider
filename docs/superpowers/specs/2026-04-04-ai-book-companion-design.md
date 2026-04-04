# AI Book Companion — Design Spec

## Product Overview

A free mobile-first reading app for classic public domain books with a spoiler-free AI companion. Users browse a library of classics, tap to read, and interact with AI that only knows up to the page they're on.

**Target user:** Casual readers who want a companion for classics — "remind me who this character is", "recap the last few chapters", "what's happening in the plot right now."

**Core value proposition:** Free classic books + AI companion that never spoils the plot. No sign-up, no purchase, just open and read.

## V1 Scope

### What we're building

1. **Library** — Browse/search curated public domain classics
2. **Reader** — Clean EPUB reader that feels like Kindle/Apple Books
3. **AI Companion** — Passage-anchored AI threads (like Google Docs comments) with spoiler protection
4. **Upload** — Secondary feature: upload your own EPUB (EPUB only for V1)

### What we're NOT building (future)

- Audiobook support
- Social features / book clubs
- AI-powered summaries (standalone)
- Read-along mode

## Book Library

### Source

Public domain books from Project Gutenberg (78,000+ books, 70+ languages).

- Fetch metadata via Gutendex API (JSON REST API)
- Books are free, no DRM, no legal issues
- Strip all Project Gutenberg branding/headers (their name is trademarked, the books are not)
- Stick to pre-1928 works to guarantee public domain status
- Check each book's copyright field from the API before including

### Notable titles available

Fiction: Pride and Prejudice, Frankenstein, Dracula, The Great Gatsby, Crime and Punishment, The Brothers Karamazov, Sherlock Holmes (complete), The Count of Monte Cristo, Moby Dick, Jane Eyre, Dr. Jekyll and Mr. Hyde, Alice in Wonderland, War and Peace, Anna Karenina, Around the World in Eighty Days, The Wonderful Wizard of Oz, Don Quixote, and thousands more.

Plus: Shakespeare's complete works, Edgar Allan Poe, Mark Twain, H.G. Wells, Jules Verne, and more.

### Library UX

- Home screen: curated categories (Popular, Fiction, Mystery, Sci-Fi, Romance, Philosophy, etc.)
- Categories are a **static mapping** shipped with the app — a curated list of ~200-500 book IDs per category, hand-picked for launch. Not relying on Gutenberg's inconsistent subject tags.
- Search by title, author, or keyword (via Gutendex API, with cached results)
- Book detail card: cover image (fallback to generated cover if Gutenberg has none), description, author, language
- Tap book → opens reader immediately (book caches silently in background)
- "Downloaded" indicator on books already cached locally
- No "download button" — caching is invisible to the user, like Spotify

### API resilience

- **Seed catalog:** ship a static JSON file with metadata for ~100-200 featured books (title, author, description, cover URL, Gutenberg ID). The home screen works even if Gutendex is down.
- **Cache metadata:** after any Gutendex API call, cache the response in IndexedDB. Subsequent visits serve from cache first, refresh in background.
- **Fallback:** if Gutendex is unreachable and no cache exists, show only the seed catalog with a "connect to browse more" message.

## Reader

The reader must feel identical to established reading apps (Kindle, Apple Books). It is NOT the differentiator — it just needs to be good enough that users don't miss their existing app.

### Standard features (must have)

- EPUB rendering via EPUB.js
- Paginated mode (scrollable deferred to post-V1 to simplify AI thread anchoring)
- Adjustable: font size, line spacing, 3 built-in fonts (serif, sans-serif, dyslexia-friendly)
- Themes: light, dark, sepia
- Page turning: tap left/right edges or swipe
- Progress bar: % complete, current page/chapter
- Table of contents navigation
- Bookmarks
- Persistent reading position per book (resume where you left off)

### Technical notes

- EPUB.js handles rendering, pagination, and page tracking
- Position tracked as CFI (Canonical Fragment Identifier) — EPUB standard for precise location
- **Spoiler boundary unit is the EPUB chapter/section (spine item), NOT page numbers.** EPUB has no fixed pages — "page" count changes with font size and screen size. Chapters are stable structural units.
- User sees a friendly progress indicator (% complete + chapter name), but internally the system operates on CFI + spine index
- Text extraction: when a book is first opened, extract plain text per chapter from the EPUB HTML and store in IndexedDB. This powers the AI search tool and is done once per book.
- PDF support deferred to post-V1 (EPUB only for uploads)

## AI Companion

### Interaction model: passage-anchored threads

The AI interaction is modeled after **Google Docs comments**, not a chat sidebar. Every conversation is anchored to a specific text passage.

#### Highlight to ask

1. User selects/highlights text in the reader
2. A popup menu appears with options:
   - **"Ask AI"** — open-ended question about this passage
   - **"Who is this?"** — character identification shortcut
   - **"Explain this"** — passage explanation shortcut
   - **"Recap up to here"** — summary of everything up to this point
3. A thread opens anchored to the highlighted passage
4. AI responds (mocked in V1)
5. Thread is saved and visible as a margin marker

#### Margin markers

- Small indicators in the margin showing where the user has AI threads
- Tap a marker to reopen the conversation
- Threads are persistent — they survive app restarts

#### General chat

- Floating button in the reader for questions not tied to a specific passage
- "List all characters so far", "What's the main conflict?", "Recap chapters 3-5"
- General threads are saved in a list accessible from the book's menu

### Spoiler protection

The core differentiator. The AI only has access to text up to the chapter the user is currently in.

#### How it works

1. User asks a question while reading in chapter 8
2. AI agent receives: the question + access to book text from chapter 1 through chapter 8 ONLY
3. Agent uses a `search_book` tool to search within chapters 1-8
4. If the answer exists within those chapters → AI answers normally
5. If the answer requires information beyond chapter 8 → AI warns:
   > "Answering this would reveal events you haven't read yet. Want me to continue anyway?"
6. User can choose to proceed (opt-in spoiler) or cancel

#### Spoiler boundary rule

The boundary is the **chapter the user is in when the question is asked**, not the user's furthest reading position. If a user goes back to chapter 3 and asks a question, the AI only knows chapters 1-3.

#### Thread continuation

When reopening a past thread, the spoiler boundary updates to the user's current chapter if they've read further, or stays at the original chapter if they've gone backward. This way, continuing a conversation never accidentally spoils.

### AI implementation (V1 — mocked)

- Use Vercel AI SDK for chat UI and streaming interface
- Mock AI provider with defined response templates:
  - **Character lookup** — "Who is this?" → returns character description based on keyword match in extracted text
  - **Passage explanation** — "Explain this" → returns contextual explanation of highlighted passage
  - **Recap** — "Recap up to here" → returns a summary placeholder for the current chapter
  - **Spoiler warning** — when question matches keywords found only in later chapters → returns spoiler warning
  - **General answer** — fallback for open-ended questions
  - **"I don't know"** — when no relevant text is found
- Dispatch logic: match on question type (from popup menu) + keyword search in extracted chapter text
- Mock `search_book` tool returns matching text passages from the book's extracted text
- The full agent architecture (tool use, streaming, spoiler detection) is built with mocked responses so swapping to real Claude API later is trivial

### AI implementation (future — real)

- Claude API via Vercel AI SDK
- Agent with `search_book` tool: full-text search over book content filtered by chapter boundary
- System prompt enforces spoiler boundary
- Potential for smarter search (fuzzy matching, semantic) if basic text search proves insufficient

## Data Storage

All data is client-side. No backend database for V1.

### IndexedDB (via a wrapper like idb or Dexie)

- **Books store:** cached EPUB files for offline reading
- **Progress store:** reading position (CFI), furthest page reached, per book
- **Threads store:** AI conversation threads with: book ID, anchor passage, anchor page, messages[], timestamp
- **Bookmarks store:** user bookmarks per book
- **Settings store:** theme, font size, font family, reading mode preferences

### Storage considerations

- Chrome/Edge: up to 60% of disk space (~generous, thousands of books)
- iOS Safari: 500MB limit, 7-day eviction if user doesn't visit. Mitigations:
  - Encourage PWA installation ("Add to Home Screen") — installed PWAs get more generous storage
  - Show friendly recovery screen if data was evicted: "Welcome back! Your library needs a quick refresh" with one-tap restore
  - Reading progress is lightweight (just CFI strings) — consider also storing in localStorage as backup since it's smaller quota but separate eviction
- Use `navigator.storage.persist()` where supported to prevent eviction
- Typical EPUB: 0.5-2MB. Even 500MB = 250-1000 books.

## Tech Stack

- **Framework:** Next.js (App Router) deployed on Vercel as PWA
- **UI:** Tailwind CSS + shadcn/ui components
- **Reader:** EPUB.js for EPUB rendering
- **AI interface:** Vercel AI SDK (mocked provider for V1)
- **Storage:** IndexedDB via Dexie.js
- **Book data:** Gutendex API for metadata + Gutenberg EPUB URLs
- **PWA:** next-pwa or Serwist for service worker, offline support, installability

## Project Structure

```
src/
  app/
    page.tsx                    # Library home screen
    book/[id]/page.tsx          # Reader view
    api/chat/route.ts           # AI chat endpoint (mocked)
  components/
    library/
      BookGrid.tsx              # Book browsing grid
      BookCard.tsx              # Individual book card
      BookDetail.tsx            # Book detail overlay
      SearchBar.tsx             # Search input
      CategoryNav.tsx           # Category navigation
    reader/
      EpubReader.tsx            # EPUB.js wrapper
      ReaderControls.tsx        # Font, theme, mode settings
      ProgressBar.tsx           # Reading progress
      TableOfContents.tsx       # TOC navigation
      Bookmarks.tsx             # Bookmark management
    ai/
      HighlightMenu.tsx         # Popup on text selection
      ThreadPanel.tsx           # Conversation thread UI
      MarginMarkers.tsx         # Thread indicators in margins
      GeneralChat.tsx           # Floating chat button + panel
      MessageBubble.tsx         # Individual message display
  lib/
    gutenberg/
      client.ts                 # Gutendex API client
      parser.ts                 # EPUB processing, PG header stripping
    reader/
      position.ts               # CFI tracking, page calculation
      bookmarks.ts              # Bookmark operations
    ai/
      mock-provider.ts          # Mock AI responses
      search-tool.ts            # Book text search (respects page boundary)
      spoiler-guard.ts          # Spoiler boundary enforcement
    storage/
      db.ts                     # Dexie.js database setup
      books.ts                  # Book storage operations
      threads.ts                # Thread CRUD
      progress.ts               # Reading progress operations
      settings.ts               # User settings
  types/
    book.ts                     # Book, Chapter, Page types
    thread.ts                   # Thread, Message types
    settings.ts                 # Settings types
```

## Core User Flows

### Flow 1: Browse and start reading

```
Open app → Library home screen with categories →
Browse or search → Tap book cover →
Book detail card (title, author, description) →
Tap "Start Reading" → Reader opens at page 1
(book caches in IndexedDB silently in background)
```

### Flow 2: Highlight and ask AI

```
Reading in Chapter 8 → Select text "Count Dracula" →
Popup: [Ask AI] [Who is this?] [Explain] [Recap] →
Tap "Who is this?" →
Thread panel slides in, anchored to highlighted passage →
AI responds with character info from chapters 1-8 only →
Thread saved → margin marker appears at that location
```

### Flow 3: General question

```
Reading in Chapter 12 → Tap floating chat button →
Type "Recap the last 3 chapters" →
AI searches chapters 10-12 →
Returns chapter-by-chapter recap →
Thread saved in general conversations list
```

### Flow 4: Spoiler warning

```
Reading in Chapter 6 → Highlight character name →
Ask "Does this character die?" →
AI searches chapters 1-6, answer not found →
AI responds: "I can't answer this without revealing events
you haven't read yet. Want me to answer anyway?" →
User taps "No thanks" or "Tell me anyway"
```

### Flow 5: Revisit past threads

```
Reading → See margin marker from earlier conversation →
Tap marker → Thread reopens with full history →
Can continue the conversation or close
```

## Accessibility

- Semantic HTML throughout — proper headings, landmarks, button roles
- Reader content must work with screen readers (EPUB.js supports ARIA)
- Keyboard navigation for all interactive elements (AI menu, thread panel, library)
- Color contrast: all 3 themes (light/dark/sepia) must meet WCAG AA contrast ratios
- Touch targets: minimum 44x44px for all tappable elements (critical for mobile reader)
- AI thread panel and highlight menu must be keyboard-dismissible

## Internationalization (V1 scope)

- **UI is English only** for V1
- Books in any language can be browsed and read (Gutenberg has 70+ languages)
- AI mock responses are English only — when real AI is wired up, it will respond in the book's language
- RTL language support deferred to post-V1

## Design Principles

1. **The reader is invisible** — it should feel so natural that users forget they're using a new app
2. **AI is contextual** — tied to what you're reading, where you are, and what you highlighted
3. **No spoilers by default** — the user must explicitly opt in to information beyond their current page
4. **Zero friction** — no sign-up, no downloads to manage, tap and read
5. **Offline first** — books work without internet after first open; AI requires connection

## Open Questions

1. **App name** — TBD
2. **Monetization** — Free with AI usage limits? Subscription for unlimited AI? Ads? (decide before launch)
3. **Book curation** — Show all 78K books or curate a smaller "featured" collection for launch?
4. **Upload UX** — How prominent should the upload feature be? Hidden in settings vs. visible in library?
5. **EPUB.js risk** — Library has inconsistent maintenance. Prototype early with diverse Gutenberg books (long ones, footnotes, images) to validate. Have Foliate.js or @nicolo-ribaudo/epub as fallback options.
