# FoodVault — UI Enhancement Requirements Document
## Version 1.1 | App Store Readiness
> **v1.1 (2026-07-28):** annotated with real implementation status after a
> code-verified review. 8 of 28 requirements are done; see
> [Implementation Status](#0-implementation-status-2026-07-28) and
> [Review Corrections](#01-review-corrections) — several v1.0 severities were wrong.

---

## 0. Implementation Status (2026-07-28)

Verified against the codebase on branch `native-apps` (commit `7460968`).

**Legend:** ✅ done · ⚠️ done, needs device test · ⬜ not started · 🚫 not recommended

### Done (8)

| REQ | Item | Status | Notes |
|-----|------|--------|-------|
| REQ-027 | Error Boundary | ✅ **Verified** | Tested by injecting a real throw — recovery screen rendered, app recovered. `src/components/ErrorBoundary.jsx`, wired in `main.jsx`. |
| REQ-012 | Search debounce | ✅ Done | 300ms debounce **+ stale-response guard**. `src/lib/useDebounce.js`, `LibraryView.jsx`. Needs a logged-in Network-tab check. |
| REQ-008 | Tab transitions | ✅ **Verified** | 150ms fade, mobile-only, honours `prefers-reduced-motion`. `index.css` `.tab-view`. |
| REQ-009 | Scroll-to-top on active tab | ✅ Done | `handleTabPress` in `App.jsx`. |
| REQ-002 | Haptics | ⚠️ Code done | `src/lib/haptics.js`. Hooked into the **toast system** (covers all success/error paths) + tab press, shopping check, delete. Native-only → device test required. |
| REQ-004 | Status bar theming | ⚠️ Code done | `src/lib/statusBar.js`; app/login/CookingMode states wired. Native-only → device test required. |
| REQ-003 | Chat keyboard fix | ⚠️ Code done | Height subtracts `@capacitor/keyboard` height + autoscroll + listener cleanup. Native-only → device test required. |
| REQ-014 | App icon & splash | ⚠️ ~90% done | Generated via `@capacitor/assets`: iOS uses the modern single 1024px asset (Xcode 14+ derives the rest — v1.0's 9-size table is outdated), all Android mipmap densities present. Only real-device visual check remains. |

Plugins installed and registered on both platforms: `@capacitor/haptics`,
`@capacitor/keyboard`, `@capacitor/status-bar` (5 total with `app` + `browser`).

### Not done (20)

| REQ | Item | Status | Why deferred |
|-----|------|--------|--------------|
| REQ-001 | Pull-to-refresh | ⬜ | Medium effort; views already refetch on mount. **Not an App Store blocker** (see corrections). |
| REQ-005 | Swipe gestures | ⬜ | Real effort + gesture-conflict risk. Post-launch, driven by user feedback. |
| REQ-006 | Bottom sheet drag-to-dismiss | ⬜ | Nice native touch; modals already close via backdrop tap + ✕. |
| REQ-007 | Image caching | ⬜ | **Largely unnecessary now** — 163 thumbnails ship bundled in the app, so most images are already offline. Also: v1.0's recommended plugin is deprecated (see corrections). |
| REQ-010 | New Chat button | ⬜ | Small, genuinely useful. Good next pick. |
| REQ-011 | Emoji → SVG icons | ⬜ | Broad but shallow change; real Android font-rendering benefit. Good next pick. |
| REQ-013 | Meal plan picker polish | ⬜ | Current picker is functional. |
| REQ-015 | Dark mode | ⬜ | Doubles styling surface area for low pre-launch payoff. |
| REQ-016 | Voice input | ⬜ | Post-launch. |
| REQ-017 | Biometric app lock | 🚫 | Recipe data isn't sensitive enough to justify the friction + encrypted-storage work. |
| REQ-018 | Push notifications | ⬜ | Needs APNs certs, backend scheduler, and a Settings view. Post-launch. |
| REQ-019 | Review prompt | ⬜ | Only meaningful once there are real users. |
| REQ-020 | Planner vertical day cards | ⬜ | Current planner works on mobile. |
| REQ-021 | Long-press context menu | ⬜ | Depends on REQ-005 gesture work. |
| REQ-022 | Chat skeletons | ⬜ | Typing indicator already covers the wait. |
| REQ-023 | Pagination | ⬜ | **Premature** — library currently holds single-digit recipes. Revisit past ~100. |
| REQ-024 | Cooking timer | ⬜ | Genuinely nice feature; post-launch. |
| REQ-025 | Export shopping list | ⬜ | Post-launch. |
| REQ-026 | Inline styles → CSS utilities | 🚫 | Pure refactor: zero user-visible value, regression risk across every screen. **Do not do pre-launch.** |
| REQ-028 | Service worker / PWA | ⬜ | Web-only benefit; native app is the launch focus. |

---

## 0.1 Review Corrections

Corrections to v1.0, found by verifying claims against the code.

**1. The severity legend was wrong — these are NOT App Store blockers.**
v1.0 marked REQ-001/002/003/004 as "🔴 CRITICAL — App Store Blocker: Yes". Apple
does not reject apps for missing haptics, pull-to-refresh, or status-bar theming.
Real rejection causes are 4.2 (minimum functionality), 4.8 (Sign in with Apple),
5.1.1(v) (account deletion), 2.1 (crashes/bugs), 5.2 (IP).
REQ-003 is the one legitimately near-critical item — an input hidden behind the
keyboard is a fair 2.1 flag.

**2. The actual App Store blockers are not in this document.**
They live in `docs/LAUNCH-CHECKLIST.md`: **Sign in with Apple** (Guideline 4.8 —
Google-only login is an expected rejection) and **working account deletion**
(5.1.1(v)). Those outrank everything here.

**3. REQ-012 was mis-severitied and misdiagnosed.**
v1.0 called it 🟡 MEDIUM "unnecessary re-renders and potential jank". In fact
search is **server-side** (`getRecipes({ q })` inside a `useEffect`), so every
keystroke fired its own Cloud Run → Supabase request — a cost and correctness
problem (out-of-order responses could render stale results). Fixed with debounce
**plus** a stale-response guard.

**4. REQ-027 was under-severitied.**
A white-screen crash is a plausible 2.1 rejection and the fix is ~30 lines. It was
the best value-per-effort item in the document; treated as top priority instead.

**5. REQ-007 recommends a deprecated plugin.**
`@capacitor-community/http` is deprecated — HTTP is built into Capacitor core now
(`CapacitorHttp`). Do not install it.

**6. Missing requirements worth adding.**
- **Network-failure / offline states.** The app was fully down during a Supabase
  outage on 2026-07-28 and rendered empty rather than "can't connect — retry".
  AI extraction can also 503. This matters more than swipe gestures.
- **Accessibility.** Appears in the testing matrix but has no requirement —
  Dynamic Type / font scaling especially.

---

## Table of Contents

0. [Implementation Status](#0-implementation-status-2026-07-28) ← **start here**
0.1 [Review Corrections](#01-review-corrections)
1. [Executive Summary](#1-executive-summary)
2. [Severity Legend](#2-severity-legend)
3. [Critical (Pre-Launch Blockers)](#3-critical-pre-launch-blockers)
4. [High (Significant UX Improvement)](#4-high-significant-ux-improvement)
5. [Medium (Polish & Native Feel)](#5-medium-polish--native-feel)
6. [Low (Nice-to-Have)](#6-low-nice-to-have)
7. [Technical Debt & Architecture](#7-technical-debt--architecture)
8. [Implementation Checklist](#8-implementation-checklist)
9. [Testing Matrix](#9-testing-matrix)

---

## 1. Executive Summary

This document catalogs all UI/UX enhancements required to bring FoodVault to App Store quality on iOS and Android. Requirements are organized by severity: **Critical** (must be done before submission), **High** (major UX lift), **Medium** (polish), and **Low** (nice-to-have). Each requirement includes acceptance criteria, platform scope, dependency notes, and file references where applicable.

---

## 2. Severity Legend

> ⚠️ **The "App Store Blocker" column below is inaccurate — see
> [Review Corrections](#01-review-corrections).** Apple does not reject apps for
> missing haptics, pull-to-refresh, or status-bar theming. The badges are still
> useful as *UX priority*, but do not read 🔴 as "will be rejected". The genuine
> submission blockers are in `docs/LAUNCH-CHECKLIST.md`.

| Badge | Meaning | App Store Blocker? |
|-------|---------|-------------------|
| 🔴 CRITICAL | Core native experience broken or missing | ~~Yes~~ → see note above |
| 🟠 HIGH | Significant UX gap users will notice | Recommended |
| 🟡 MEDIUM | Polish that elevates perceived quality | No |
| 🟢 LOW | Nice-to-have; ship without | No |

---

## 3. Critical (Pre-Launch Blockers)

---

### REQ-001 — Pull-to-Refresh on All Scrollable Content Feeds
**Severity:** 🔴 CRITICAL | **Platforms:** iOS & Android | **Files:** Multiple views
**Status:** ⬜ NOT DONE — deferred (not an App Store blocker)

#### Description
Implement pull-to-refresh gesture on all scrollable content views. This is standard native behavior expected on every mobile content feed.

#### Affected Views
| View | Container to Make Pullable |
|------|---------------------------|
| HomeView | Entire page scroll container |
| HomeView | "Today's Meals" horizontal strip (pull down on the strip itself) |
| HomeView | "Recently Added" horizontal strip |
| LibraryView | Recipe grid/list container (below sticky search bar) |
| ShoppingView | Grouped shopping list container |
| PlannerView | Calendar grid scroll container |
| TodayView | Meal cards grid |

#### Acceptance Criteria
- [ ] On mobile (`max-width: 767px`), pulling down past the content top edge reveals a spinner
- [ ] Spinner color matches `var(--primary)` (`#D4522A`)
- [ ] Release triggers a full data refetch for that view via existing API hooks
- [ ] Spinner hides and content updates when fetch completes
- [ ] On desktop, show a subtle circular refresh button in the top-right of each section instead of pull gesture
- [ ] Must use `overscroll-behavior-y: contain` to prevent body bounce while allowing pull gesture
- [ ] No interference with existing horizontal scroll strips (Today's Meals, Recently Added)

#### Implementation Notes
- Create a reusable `<PullToRefresh>` wrapper component
- Use native touch events (`touchstart` / `touchmove` / `touchend`) with `transform: translateY()` visual
- Or evaluate `react-pull-to-refresh` library that respects Capacitor webview
- On desktop, render a small refresh icon button that calls the same refetch function

#### Dependencies
- None (pure frontend)

---

### REQ-002 — Haptic Feedback on All Primary Interactions
**Severity:** 🔴 CRITICAL | **Platforms:** iOS & Android | **Files:** `App.jsx`, all view components
**Status:** ⚠️ CODE DONE — needs device test

#### Description
Add tactile feedback using `@capacitor/haptics` on every primary user action. This is the single highest-impact "native feel" improvement.

#### Plugin
```bash
npm install @capacitor/haptics
npx cap sync
```

#### Interaction Mapping

| Interaction | Haptic Type | Location | Trigger |
|------------|-------------|----------|---------|
| Check/uncheck shopping item | `ImpactStyle.Light` | `ShoppingView.jsx` | Item row tap |
| Save recipe | `ImpactStyle.Medium` | `LibraryView.jsx` (AddRecipeModal) | Save button press |
| Delete (any) | `ImpactStyle.Heavy` | `LibraryView.jsx`, `ShoppingView.jsx` | Confirm delete |
| Complete cooking step | `NotificationType.Success` | `CookingMode.jsx` | "Next Step" on final step |
| AI plan generated | `NotificationType.Success` | `HomeView.jsx`, `PlannerView.jsx` | "Plan with AI" success |
| Error / failure | `NotificationType.Error` | Anywhere with toast | API error toast shown |
| Mark recipe as cooked | `ImpactStyle.Light` | `LibraryView.jsx` (RecipeDetailModal) | Toggle button |
| Add to meal plan | `ImpactStyle.Medium` | `LibraryView.jsx` (inline picker) | Confirm button |
| Tab switch | `ImpactStyle.Light` | `App.jsx` bottom nav | Active tab tap (mobile only) |
| Share action | `ImpactStyle.Light` | `LibraryView.jsx` (RecipeDetailModal) | Share button |
| Modal open | `ImpactStyle.Light` | `App.jsx` | Any modal overlay opens |
| Modal dismiss | `ImpactStyle.Light` | `App.jsx` | Any modal closes |

#### Acceptance Criteria
- [ ] Haptics only fire when `isNativeApp()` returns `true` (skip on web/PWA)
- [ ] Graceful fallback if haptics plugin fails to load — wrap every call in `try/catch`
- [ ] No perceptible lag — fire haptic synchronously before async operations begin
- [ ] Both iOS and Android tested; Android uses `Haptics.vibrate()` as fallback if impact styles unavailable
- [ ] A reusable `triggerHaptic(style)` utility created in `src/lib/haptics.js`

#### Implementation Notes
```js
// src/lib/haptics.js
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNativeApp } from './platform'

export const haptic = {
  light:    () => isNativeApp() && Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}),
  medium:   () => isNativeApp() && Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}),
  heavy:    () => isNativeApp() && Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}),
  success:  () => isNativeApp() && Haptics.notification({ type: NotificationType.Success }).catch(() => {}),
  error:    () => isNativeApp() && Haptics.notification({ type: NotificationType.Error }).catch(() => {}),
}
```

---

### REQ-003 — Fix Keyboard Handling in ChatView (Mobile)
**Severity:** 🔴 CRITICAL | **Platforms:** iOS & Android | **Files:** `ChatView.jsx`, `App.jsx`
**Status:** ⚠️ CODE DONE — needs device test

#### Description
On mobile devices, opening the software keyboard in ChatView hides the input field behind the keyboard because the container uses a fixed `calc(100dvh - 160px)` height. iOS Safari in particular does not resize the viewport when the keyboard opens.

#### Plugin
```bash
npm install @capacitor/keyboard
npx cap sync
```

#### Current Broken Behavior
- User taps input field → keyboard slides up → input field is hidden behind keyboard
- User cannot see what they are typing
- Message list does not auto-scroll to keep latest message visible

#### Acceptance Criteria
- [ ] When soft keyboard opens, the chat message container shrinks so the input field remains fully visible above the keyboard
- [ ] When keyboard closes, container expands back to full height smoothly
- [ ] The message list auto-scrolls to the bottom when the keyboard opens
- [ ] No visual jump or layout thrashing during keyboard transition
- [ ] iOS Safari "viewport resize" bug handled (`100dvh` does not shrink on keyboard open on iOS)
- [ ] On web (non-native), keep current behavior — browser viewport resize handles it naturally
- [ ] Keyboard open/close listeners cleaned up on component unmount

#### Implementation Notes
1. In `App.jsx` `useEffect` (native only):
```js
import { Keyboard } from '@capacitor/keyboard'
if (isNativeApp()) {
  Keyboard.setResizeMode({ mode: 'body' }) // or 'native' depending on testing
}
```

2. In `ChatView.jsx`, listen to keyboard events and adjust container:
```js
useEffect(() => {
  if (!isNativeApp()) return
  let removeShow, removeHide
  Promise.all([
    Keyboard.addListener('keyboardWillShow', info => setKeyboardHeight(info.keyboardHeight)),
    Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0))
  ]).then(([s, h]) => { removeShow = s; removeHide = h })
  return () => { removeShow?.remove(); removeHide?.remove() }
}, [])
```

3. Adjust container height dynamically:
```jsx
<div style={{ height: `calc(100dvh - 160px - ${keyboardHeight}px)` }}>
```

---

### REQ-004 — Status Bar Theming for Native Shell
**Severity:** 🔴 CRITICAL | **Platforms:** iOS & Android | **Files:** `App.jsx`, `CookingMode.jsx`, `LoginView.jsx`
**Status:** ⚠️ CODE DONE — needs device test

#### Description
The app header uses a warm cream background (`#FAF8F3`) with dark text, but the native status bar is not explicitly styled. On some Android devices the status bar background remains the system default. The CookingMode fullscreen dark view also needs matching status bar theming.

#### Plugin
```bash
npm install @capacitor/status-bar
npx cap sync
```

#### Acceptance Criteria
- [ ] On app launch, status bar style set to `Style.Light` (dark text/icons) to match the light cream theme
- [ ] On Android, status bar background color set to `#FAF8F3`
- [ ] When CookingMode opens (dark fullscreen `#1C1610`), status bar dynamically switches to `Style.Dark` (light text/icons) with background `#1C1610`
- [ ] When CookingMode closes, original status bar style restored
- [ ] On login screen, status bar matches the warm gradient background (use `#fff6f0`)
- [ ] On web, no-op (browser handles its own chrome)
- [ ] All status bar changes wrapped in `isNativeApp()` checks

#### Implementation Notes
Create a reusable hook `useStatusBar(color, style)`:
```js
// src/lib/statusBar.js
import { StatusBar, Style } from '@capacitor/status-bar'
import { isNativeApp } from './platform'

export async function setStatusBar(color, darkText = true) {
  if (!isNativeApp()) return
  await StatusBar.setBackgroundColor({ color })
  await StatusBar.setStyle({ style: darkText ? Style.Light : Style.Dark })
}
```

Call sites:
- `App.jsx` mount → `setStatusBar('#FAF8F3', true)`
- `CookingMode.jsx` mount → `setStatusBar('#1C1610', false)`
- `CookingMode.jsx` unmount → restore previous
- `LoginView.jsx` mount → `setStatusBar('#fff6f0', true)`

---

## 4. High (Significant UX Improvement)

---

### REQ-005 — Swipe Gestures on Recipe Cards & Shopping Items
**Severity:** 🟠 HIGH | **Platforms:** iOS & Android | **Files:** `LibraryView.jsx`, `ShoppingView.jsx`
**Status:** ⬜ NOT DONE — post-launch

#### Description
Add native-style swipe gestures for faster interactions. This is a core interaction pattern users expect in native list-based apps.

#### LibraryView — Recipe Card Swipe (List Mode Only)
- Swipe left on a recipe list row to reveal action buttons
- Reveal width: 80px per button
- Buttons:
  - **Green (left):** "🗓️ Plan" → opens meal plan picker inline
  - **Red (right):** "🗑️ Delete" → triggers delete confirmation
- Tap outside the row or swipe back right to close revealed actions
- Grid view: disable swipe (cards are too small for swipe affordance)

#### ShoppingView — Item Swipe
- Swipe right on a shopping item to toggle checked/unchecked
- Visual feedback: row background briefly flashes green on check, returns to normal on uncheck
- Haptic feedback (light impact) on toggle

#### Acceptance Criteria
- [ ] Swipe follows finger 1:1 with no perceptible lag
- [ ] Does not interfere with vertical scroll (distinguish horizontal swipe from vertical scroll)
- [ ] Works on touch devices only; mouse/desktop users see existing buttons (no change)
- [ ] Swipe velocity aware: fast flick reveals full actions even if distance < threshold
- [ ] Swipe actions are accessible (screen reader announces revealed actions)

#### Implementation Notes
- Evaluate `hammerjs` for robust touch gesture handling
- Or implement custom touch tracking with `touchstart` / `touchmove` / `touchend` on each row
- Use `transform: translateX()` for the swipe animation (GPU-accelerated)
- Add `touch-action: pan-y` to rows to allow vertical scroll while capturing horizontal swipe

---

### REQ-006 — Bottom Sheet Drag-to-Dismiss for Modals
**Severity:** 🟠 HIGH | **Platforms:** iOS & Android | **Files:** All modal components
**Status:** ⬜ NOT DONE — post-launch

#### Description
Current modals use CSS entrance/exit animations but do not support the native drag-to-dismiss gesture. Users expect to grab the handle and swipe down to close.

#### Affected Modals
| Modal | File | Handle Element |
|-------|------|---------------|
| OnboardingModal | `App.jsx` | `.modal-handle` |
| DeleteAccountModal | `App.jsx` | `.modal-handle` |
| AddRecipeModal | `LibraryView.jsx` | `.modal-handle` |
| RecipeDetailModal | `LibraryView.jsx` | `.modal-handle` |
| RecipePicker | `PlannerView.jsx` | `.modal-handle` |
| PhotoUrlDialog | `LibraryView.jsx` | `.modal-handle` |

#### Acceptance Criteria
- [ ] On mobile: dragging the modal handle (`.modal-handle`) downward past 120px dismisses the modal
- [ ] Drag follows finger position with `transform: translateY()` during gesture
- [ ] Backdrop opacity decreases proportionally as modal is dragged down (opacity = 1 - dragRatio)
- [ ] Velocity-aware: a fast flick downward dismisses even if distance < 120px
- [ ] On desktop: keep existing click-outside-to-dismiss behavior; drag not required
- [ ] `overscroll-behavior: contain` prevents body scroll during drag
- [ ] Modal content scroll (vertical) does not conflict with drag gesture

#### Implementation Notes
- Create a reusable `<BottomSheet>` component that wraps any modal content
- The drag target is specifically the `.modal-handle` element (not the entire modal)
- Track drag with `touchstart` on handle, `touchmove` on document, `touchend` on document
- On drag end, if `translateY > 120` or `velocity > 0.5`, dismiss; else animate back to 0
- Use `requestAnimationFrame` for smooth drag following

---

### REQ-007 — Image Caching for Offline Recipe Thumbnails
**Severity:** 🟠 HIGH | **Platforms:** iOS & Android | **Files:** `src/lib/staticThumbs.js`, `src/lib/api.js`
**Status:** ⬜ NOT DONE — mostly moot (thumbnails ship bundled); **plugin below is deprecated**

#### Description
Currently, `recipeThumb()` returns a proxied URL that fetches through the backend on every load. In a native app, users expect recipe images to work offline after first view.

#### Current Flow
```
recipeThumb(recipe)
  → if recipe.thumbnail: imageProxyUrl(recipe.thumbnail)
  → else: staticThumb(recipe.title, recipe.category_name)
```

#### Desired Flow
```
recipeThumb(recipe)
  → Check local cache first
  → If cached: serve from cache
  → If not cached: fetch via proxy → store in cache → serve
  → If fetch fails: static thumbnail fallback
```

#### Acceptance Criteria
- [ ] First load: image fetches via `imageProxyUrl()` as today
- [ ] Subsequent loads: image served from local device cache
- [ ] Cache persists across app restarts
- [ ] Cache eviction: LRU with max 100MB cap; oldest images evicted first
- [ ] Failed cache reads fall back to network, then to static thumbnail library
- [ ] Pre-cache all static thumbnail library assets on app install (they're already bundled in `/thumbnails/`)
- [ ] Cache key: SHA-256 of the proxied URL or recipe ID

#### Implementation Options

**Option A — Native HTTP Stack (Recommended)**
Use `@capacitor-community/http` which uses the native HTTP stack with its own disk cache:
```bash
npm install @capacitor-community/http
```
This automatically caches HTTP responses including images.

**Option B — Capacitor FileSystem**
Download images to app documents directory on first view:
```bash
npm install @capacitor/filesystem
```
Store images as files, serve via `Filesystem.readFile()` + data URL.

**Option C — Service Worker + Cache API (PWA approach)**
For the web build, add a service worker that caches image proxy responses.

#### Recommended Approach
Start with **Option A** for native builds. It requires minimal code changes — just swap `fetch`/`axios` for the native HTTP plugin when `isNativeApp()` is true. The native HTTP stack handles caching automatically.

---

### REQ-008 — Navigation Transition Animations
**Severity:** 🟠 HIGH | **Platforms:** All | **Files:** `App.jsx`
**Status:** ✅ DONE — verified in browser

#### Description
Tab switches are instant cuts. Add subtle transitions for an app-like feel.

#### Acceptance Criteria
- [ ] Tab switch: 150ms fade transition between views (`opacity: 0 → 1`)
- [ ] New view fades in while old view fades out simultaneously
- [ ] Transitions apply to the `<main>` content area only, not the header or nav bars
- [ ] No transition on initial app load (first tab render is instant)
- [ ] Disable transitions on desktop (`min-width: 768px`) — instant is fine for mouse users
- [ ] Optional bonus: horizontal slide directionally — left-tab switch slides new view from left, right-tab from right

#### Implementation Notes
```jsx
// In App.jsx, wrap the view render:
<main>
  <div key={tab} className="tab-transition" style={{ animation: 'fadeIn 150ms ease' }}>
    {views[tab]}
  </div>
</main>
```

Or use a CSS-only approach with a class toggle:
```css
.tab-view {
  opacity: 0;
  transition: opacity 150ms ease;
}
.tab-view.active {
  opacity: 1;
}
```

---

### REQ-009 — Scroll-to-Top on Active Tab Tap
**Severity:** 🟠 HIGH | **Platforms:** iOS & Android | **Files:** `App.jsx`, all view components
**Status:** ✅ DONE

#### Description
Standard native behavior: tapping the currently active tab icon should scroll that view to the top.

#### Acceptance Criteria
- [ ] Mobile bottom nav: tapping the active tab button scrolls the current view's scroll container to top with `behavior: 'smooth'`
- [ ] Desktop nav: same behavior on active tab button click
- [ ] Visual feedback: brief opacity pulse (0.7 → 1.0 over 200ms) on the tab icon
- [ ] Only triggers scroll if the view is not already at top (check `scrollTop === 0`)
- [ ] Each view exposes a `scrollToTop()` method via `useImperativeHandle` or a ref callback

#### Implementation Notes
Use `useRef` in each view to capture the scrollable container, then expose:
```js
// In HomeView.jsx, LibraryView.jsx, etc.
const scrollRef = useRef()
useImperativeHandle(ref, () => ({
  scrollToTop: () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
}))
```

In `App.jsx`, store refs for each view and call `scrollToTop()` on active tab tap.

---

## 5. Medium (Polish & Native Feel)

---

### REQ-010 — Add "New Chat" Button to ChatView
**Severity:** 🟡 MEDIUM | **Platforms:** All | **Files:** `ChatView.jsx`
**Status:** ⬜ NOT DONE — good next pick

#### Description
The AI chat has no way to clear conversation history and start fresh.

#### Acceptance Criteria
- [ ] A "New chat" icon button appears in the ChatView header, positioned to the right of the "Live" badge
- [ ] Icon: `✕` or a refresh/restart SVG icon
- [ ] Tapping it shows a confirmation modal: "Start a new conversation? Your current chat will be cleared."
- [ ] On confirm: reset `messages` state to the initial assistant greeting, clear `input`, scroll to top
- [ ] No backend state to clear (chat is stateless per current API design)
- [ ] Keyboard focus returns to input after reset

---

### REQ-011 — Replace Emoji Icons with SVG Icons
**Severity:** 🟡 MEDIUM | **Platforms:** All | **Files:** Multiple
**Status:** ⬜ NOT DONE — good next pick

#### Description
Several UI elements use text emoji instead of consistent SVG icons. Emojis render inconsistently across Android devices with custom fonts, and they don't match the polished SVG icon style used elsewhere.

#### Replacement Map

| Location | Current Emoji | Replacement |
|----------|--------------|-------------|
| OnboardingModal steps | `📱`, `🗂️`, `✦` | Custom 24×24 SVGs |
| HomeView QuickAction | `➕`, `✦` | SVG plus, SVG sparkle |
| RecipeDetailModal actions | `🗓️`, `🛒`, `🔗`, `👨‍🍳` | SVG calendar, cart, link, chef-hat |
| ChatView avatars | `✦`, `👤` | SVG sparkle, SVG user |
| Empty states | `🍽️`, `📚`, `🛒` | SVG food, book, cart |
| Login features | `📱`, `🗂️`, `🍽️`, `✦` | Consistent icon set |
| "Change photo" button | `✎` | SVG pencil/edit icon |

#### Acceptance Criteria
- [ ] All icons use a consistent 24×24 SVG set with `stroke="currentColor"` for theming
- [ ] Icons respect the app's color tokens (`var(--primary)`, `var(--sage)`, etc.)
- [ ] No emoji rendering issues on Android devices with custom fonts
- [ ] All SVGs are inline (no external requests) for offline resilience

#### Implementation Notes
Create a shared `src/components/Icons.jsx` file:
```jsx
export const IconPlus = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
// ... etc for all icons
```

---

### REQ-012 — Search Debounce in LibraryView
**Severity:** 🟡 MEDIUM | **Platforms:** All | **Files:** `LibraryView.jsx`
**Status:** ✅ DONE — debounce + stale-response guard

#### Description
The LibraryView search input filters recipes on every keystroke without debouncing, causing unnecessary re-renders and potential jank with large libraries.

#### Acceptance Criteria
- [ ] Search input value updates React state immediately for responsive typing feedback
- [ ] Filtering logic debounced by 200ms using `useDeferredValue` or a custom debounce hook
- [ ] Show a "Searching…" spinner only if filter computation takes >300ms (unlikely, but good practice)
- [ ] Clear search text when user switches category filter
- [ ] No visual "stutter" when typing quickly

#### Implementation Notes
```js
// Custom debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// In LibraryView:
const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 200)
const filteredRecipes = useMemo(() => {
  return recipes.filter(r => r.title.toLowerCase().includes(debouncedSearch.toLowerCase()))
}, [recipes, debouncedSearch])
```

---

### REQ-013 — Recipe Detail Modal — Inline Meal Plan Picker Improvements
**Severity:** 🟡 MEDIUM | **Platforms:** All | **Files:** `LibraryView.jsx` (RecipeDetailModal)
**Status:** ⬜ NOT DONE

#### Description
The current inline meal plan picker in `RecipeDetailModal` is functional but cramped and lacks visual polish.

#### Acceptance Criteria
- [ ] Day selector uses a horizontal scrollable pill row with actual date numbers (e.g., "Mon 21", "Tue 22") not just "Mon" / "Tue"
- [ ] Today's pill is pre-selected and highlighted with `var(--primary)` background
- [ ] Past days are visually dimmed (lower opacity) and non-interactive
- [ ] Slot selector shows a small dot indicator if a recipe is already planned for that slot
- [ ] "Add to Plan" button disabled until both day and slot are selected
- [ ] After adding, show a brief success toast and auto-close the picker after 600ms
- [ ] Picker slides in with a 200ms animation instead of appearing instantly

---

### REQ-014 — Add App Icon & Splash Screen Assets
**Severity:** 🟡 MEDIUM | **Platforms:** iOS & Android | **Files:** Native asset directories
**Status:** ⚠️ ~90% DONE — assets generated; size table below is outdated

#### Description
Ensure all native assets are production-ready for App Store and Google Play submission.

#### iOS — `ios/App/App/Assets.xcassets/AppIcon.appiconset`
| Size | Filename |
|------|----------|
| 20pt @2x | Icon-20@2x.png (40×40) |
| 20pt @3x | Icon-20@3x.png (60×60) |
| 29pt @2x | Icon-29@2x.png (58×58) |
| 29pt @3x | Icon-29@3x.png (87×87) |
| 40pt @2x | Icon-40@2x.png (80×80) |
| 40pt @3x | Icon-40@3x.png (120×120) |
| 60pt @2x | Icon-60@2x.png (120×120) |
| 60pt @3x | Icon-60@3x.png (180×180) |
| 1024pt | Icon-1024.png (1024×1024) |

#### Android — `android/app/src/main/res/mipmap-*/`
| Density | Folder | Size |
|---------|--------|------|
| mdpi | mipmap-mdpi | 48×48 |
| hdpi | mipmap-hdpi | 72×72 |
| xhdpi | mipmap-xhdpi | 96×96 |
| xxhdpi | mipmap-xxhdpi | 144×144 |
| xxxhdpi | mipmap-xxxhdpi | 192×192 |

#### Splash Screen
- **iOS:** `ios/App/App/Assets.xcassets/Splash.imageset/` — full-bleed gradient background with centered logo
- **Android:** `android/app/src/main/res/drawable/` — same gradient + logo, supports all screen densities
- Background: `linear-gradient(135deg, #fff6f0, #ffe8d6)`
- Logo: 🍽️ icon at 2x size, terracotta gradient square behind it
- Duration: 1.5 seconds max, then fade to app

#### Acceptance Criteria
- [ ] All iOS icon sizes generated and placed in correct asset catalog
- [ ] All Android mipmap densities populated
- [ ] Splash screen displays correctly on iPhone SE through iPhone 15 Pro Max
- [ ] Splash screen displays correctly on Android small through extra-large screens
- [ ] No blank white screen between splash and app load
- [ ] App icon renders crisply on all device sizes

---

## 6. Low (Nice-to-Have)

---

### REQ-015 — Dark Mode Theme
**Severity:** 🟢 LOW | **Platforms:** All | **Files:** `index.css`, all components
**Status:** ⬜ NOT DONE — post-launch

#### Description
Add a dark mode toggle and automatic system preference detection.

#### Color Tokens (Dark)
| Token | Light Value | Dark Value |
|-------|-------------|------------|
| `--cream` | `#FAF8F3` | `#1C1610` |
| `--cream-2` | `#F3EFE7` | `#2A231C` |
| `--cream-3` | `#EDE8DE` | `#3A3328` |
| `--white` | `#FFFFFF` | `#2A231C` |
| `--border` | `#E8E2D9` | `#4A4238` |
| `--border-2` | `#D9D1C5` | `#5A5248` |
| `--ink` | `#1C1610` | `#F3EFE7` |
| `--ink-2` | `#5C5044` | `#C4B8A8` |
| `--ink-3` | `#9C8E80` | `#8A7E70` |
| `--primary` | `#D4522A` | `#E86B42` |
| `--primary-bg` | `#FDF3EE` | `#3A1E14` |

#### Acceptance Criteria
- [ ] Toggle in user menu (header avatar dropdown): "🌙 Dark Mode"
- [ ] Persists preference in `localStorage` as `fv_theme`
- [ ] Respects `prefers-color-scheme` on first load (no stored preference)
- [ ] Smooth 300ms CSS transition on all color changes
- [ ] CookingMode already dark — ensure colors remain consistent
- [ ] All inline styles that hardcode light colors updated to use CSS variables
- [ ] Status bar updates dynamically with theme (REQ-004)

---

### REQ-016 — Voice Input Button in Chat & Search
**Severity:** 🟢 LOW | **Platforms:** iOS & Android | **Files:** `ChatView.jsx`, `LibraryView.jsx`
**Status:** ⬜ NOT DONE — post-launch

#### Description
Add a microphone button next to text inputs for voice-to-text input.

#### Locations
- ChatView message input (right of text input, left of send button)
- LibraryView search input (right of search field)

#### Acceptance Criteria
- [ ] Microphone icon appears only when speech recognition is available
- [ ] Tap to start recording — icon pulses/red glow animation
- [ ] Tap again or pause for 2s to stop recording
- [ ] Transcribed text inserts at cursor position in the input
- [ ] On native, use Web Speech API or a native speech recognition plugin
- [ ] Graceful hide if `window.SpeechRecognition` is unavailable

---

### REQ-017 — Biometric App Lock
**Severity:** 🟢 LOW | **Platforms:** iOS & Android | **Files:** `App.jsx`
**Status:** 🚫 NOT RECOMMENDED — friction outweighs benefit for recipe data

#### Description
Allow users to optionally lock the app with Face ID / Touch ID / fingerprint.

#### Plugin
```bash
npm install @capacitor/biometric-auth
# or
npm install @aparajita/capacitor-biometric-auth
```

#### Acceptance Criteria
- [ ] Setting in user menu: "🔒 Enable App Lock"
- [ ] When enabled, app requires biometric auth on cold start
- [ ] Also requires re-auth after 5 minutes in background
- [ ] Fallback to device PIN if biometric fails or is cancelled
- [ ] Setting stored in encrypted preferences (not plain localStorage)
- [ ] Can be disabled from the same menu
- [ ] Only available on native (`isNativeApp()`)

---

### REQ-018 — Push Notifications for Meal Reminders
**Severity:** 🟢 LOW | **Platforms:** iOS & Android | **Files:** Backend + Frontend
**Status:** ⬜ NOT DONE — needs APNs + backend scheduler

#### Description
Send timely push notifications based on meal plans.

#### Plugin
```bash
npm install @capacitor/push-notifications
npx cap sync
```

#### Notification Types
| Time | Trigger | Payload |
|------|---------|---------|
| 8:00 AM | Breakfast planned | "Good morning! Today's breakfast: [recipe name]" |
| 12:00 PM | Lunch planned | "Lunch time — [recipe name] is on your menu" |
| 6:00 PM | Dinner planned | "Start cooking: [recipe name]" |
| Sunday 9:00 AM | Weekly summary | "This week: [N] meals planned. Generate your shopping list?" |
| Any time | Shopping list unchecked items | "Your shopping list has [N] unchecked items" |

#### Acceptance Criteria
- [ ] User can toggle each notification type in a new Settings view
- [ ] Notifications deep-link to the relevant view (Today, Shopping, etc.)
- [ ] Backend generates notification payloads based on meal plan data
- [ ] Local notifications as fallback if backend push fails
- [ ] iOS notification permissions requested on first enable, not on app launch
- [ ] Android notification channel created with appropriate importance

---

### REQ-019 — In-App App Store Review Prompt
**Severity:** 🟢 LOW | **Platforms:** iOS & Android | **Files:** `App.jsx`
**Status:** ⬜ NOT DONE — needs real users first

#### Description
Prompt satisfied users to leave a review at opportune moments.

#### Plugin
```bash
npm install @capacitor/app-rate
# or native APIs directly
```

#### Trigger Conditions (ALL must be met)
- User has cooked 5+ recipes (marked as cooked)
- OR user has generated 3+ AI meal plans
- OR user has used the app for 7+ days
- AND at least 30 days since last prompt
- AND user has not declined a prompt in the last 90 days

#### Acceptance Criteria
- [ ] On iOS: uses `SKStoreReviewController` (system native prompt, no redirect)
- [ ] On Android: uses Google Play In-App Review API
- [ ] Max 3 prompts per year per user
- [ ] Never prompt if user recently declined
- [ ] Prompt shown after a positive interaction (e.g., completing cooking mode)

---

### REQ-020 — Planner Mobile View — Vertical Day Cards
**Severity:** 🟢 LOW | **Platforms:** Mobile Only | **Files:** `PlannerView.jsx`
**Status:** ⬜ NOT DONE

#### Description
The current planner uses a horizontal-scroll calendar grid. On small screens, a vertical day-list is more scannable and touch-friendly.

#### Acceptance Criteria
- [ ] On screens `< 768px`, render a vertical list of day cards instead of the grid
- [ ] Each day card shows: date number, day name, and 4 meal slots stacked vertically
- [ ] Slots show recipe thumbnail + title, or a "+ Plan" button
- [ ] Tap a slot to open recipe picker (same behavior as today)
- [ ] Keep the grid view on desktop (`>= 768px`)
- [ ] Add a view toggle on tablet sizes (768px–1024px) to switch between grid and list
- [ ] Today's card is pinned to the top and highlighted with `var(--primary-bg)` border

---

### REQ-021 — Long-Press Context Menu on Recipe Cards
**Severity:** 🟢 LOW | **Platforms:** iOS & Android | **Files:** `LibraryView.jsx`
**Status:** ⬜ NOT DONE — depends on REQ-005

#### Description
Add native-style context menus triggered by long-pressing recipe cards.

#### Menu Items
1. **Cook Now** — opens CookingMode if instructions exist; else shows "No instructions" toast
2. **Add to Plan** — opens meal plan picker
3. **Add to Shopping** — adds recipe ingredients to shopping list
4. **Share** — opens native share sheet
5. **Delete** — shows confirmation, then deletes

#### Acceptance Criteria
- [ ] Long-press (500ms hold) on any recipe card shows context menu overlay
- [ ] Menu appears anchored to the card position (centered above the card)
- [ ] Tap outside menu to dismiss
- [ ] Each action executes immediately with appropriate haptic feedback
- [ ] Not shown on desktop (mouse right-click is separate concern)
- [ ] Menu uses the app's design tokens (cream background, border radius, shadows)

---

### REQ-022 — Add Loading Skeletons to ChatView
**Severity:** 🟢 LOW | **Platforms:** All | **Files:** `ChatView.jsx`
**Status:** ⬜ NOT DONE

#### Description
ChatView shows a typing indicator but no skeleton for the initial load state.

#### Acceptance Criteria
- [ ] When opening ChatView, show 2–3 skeleton message bubbles in the assistant message style
- [ ] Skeletons use the existing `.shimmer` CSS class
- [ ] Disappear once the welcome message renders (it's instant today, but future-proofing)
- [ ] If AI response takes >1s, show a skeleton bubble before the typing dots appear

---

### REQ-023 — Pagination for Recipe Library
**Severity:** 🟢 LOW | **Platforms:** All | **Files:** `LibraryView.jsx`, Backend API
**Status:** ⬜ NOT DONE — premature (single-digit recipe count)

#### Description
`getRecipes()` currently loads all recipes at once. For users with 100+ recipes, this causes slow initial load and memory pressure.

#### Acceptance Criteria
- [ ] API `/recipes` endpoint supports `limit` (default 24) and `offset` query params
- [ ] Frontend implements infinite scroll in LibraryView
- [ ] Trigger next page load when user scrolls within 200px of bottom
- [ ] Show a small spinner at bottom during page fetch
- [ ] Search and category filters apply server-side with pagination
- [ ] Maintain current "Recently Added" sort order (newest first)
- [ ] Total recipe count still shown in header (from a lightweight `/recipes/count` endpoint or `X-Total-Count` header)

---

### REQ-024 — Add "Cooking Timer" Inside CookingMode
**Severity:** 🟢 LOW | **Platforms:** All | **Files:** `CookingMode.jsx`
**Status:** ⬜ NOT DONE — post-launch

#### Description
Some recipe steps mention cooking durations. Detect these and offer inline timers.

#### Acceptance Criteria
- [ ] Detect time mentions in step text via regex: `/\d+\s*(min|minute|minutes|hr|hour|hours)/gi`
- [ ] Show a "⏱️ Start Timer" button inline with the step text when a duration is detected
- [ ] Tap opens a countdown overlay with play / pause / reset controls
- [ ] Timer runs in background with a native notification when complete
- [ ] Multiple timers can run simultaneously (max 3)
- [ ] Timer overlay is semi-transparent and does not block step reading

---

### REQ-025 — Export Shopping List to PDF / Share Sheet
**Severity:** 🟢 LOW | **Platforms:** All | **Files:** `ShoppingView.jsx`
**Status:** ⬜ NOT DONE — post-launch

#### Description
Allow users to export or share their shopping list in a clean, readable format.

#### Acceptance Criteria
- [ ] "Share" button in ShoppingView header (next to "Clear")
- [ ] Generates a clean text list grouped by category with checkboxes
- [ ] On native: opens system share sheet via `@capacitor/share`
- [ ] On web: copies formatted text to clipboard with a toast confirmation
- [ ] Optional: triggers browser print dialog for PDF generation
- [ ] Include app branding at bottom: "Generated by FoodVault"

---

## 7. Technical Debt & Architecture

---

### REQ-026 — Extract Inline Styles to CSS Classes
**Severity:** 🟡 MEDIUM | **Platforms:** All | **Files:** All `.jsx` files
**Status:** 🚫 NOT RECOMMENDED pre-launch — refactor with regression risk, no user value

#### Description
The codebase uses extensive inline `style={{...}}` objects. While functional, this bloats JSX, makes theming harder, and prevents CSS-level optimizations.

#### Acceptance Criteria
- [ ] Create `src/styles/utilities.css` with utility classes for repeated patterns:
  ```css
  .flex-row { display: flex; align-items: center; }
  .flex-col { display: flex; flex-direction: column; }
  .gap-sm { gap: 8px; }
  .gap-md { gap: 12px; }
  .gap-lg { gap: 16px; }
  .text-ink { color: var(--ink); }
  .text-ink-2 { color: var(--ink-2); }
  .text-ink-3 { color: var(--ink-3); }
  .text-primary { color: var(--primary); }
  .rounded-sm { border-radius: 10px; }
  .rounded-card { border-radius: 16px; }
  .rounded-pill { border-radius: 99px; }
  .shadow-sm { box-shadow: var(--shadow-sm); }
  .shadow-md { box-shadow: var(--shadow-md); }
  ```
- [ ] Migrate the 20 most-repeated inline patterns to utility classes
- [ ] Keep dynamic values (computed colors, conditional widths) as inline; move static values to CSS
- [ ] No visual regression — pixel-perfect match before and after
- [ ] Document the utility class convention in a code comment at top of `utilities.css`

---

### REQ-027 — Add Error Boundary
**Severity:** 🟡 MEDIUM | **Platforms:** All | **Files:** `App.jsx`, new `ErrorBoundary.jsx`
**Status:** ✅ DONE — verified by injected-throw test

#### Description
Add a React Error Boundary to catch runtime crashes gracefully instead of showing a white screen.

#### Acceptance Criteria
- [ ] Wrap the app root with an `<ErrorBoundary>` component
- [ ] On crash, show a friendly error screen with:
  - "Something went wrong" heading
  - "Don't worry — your data is safe" reassurance
  - "Reload App" button that calls `window.location.reload()`
  - "Copy Error Details" button for support
- [ ] Log errors to console with full stack trace
- [ ] Optional: POST error details to a backend `/logs/crash` endpoint
- [ ] Prevent white-screen crashes on all unhandled rendering errors

#### Implementation
```jsx
// src/components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('ErrorBoundary:', error, info) }
  render() {
    if (this.state.hasError) return <ErrorScreen error={this.state.error} />
    return this.props.children
  }
}
```

---

### REQ-028 — Service Worker for PWA
**Severity:** 🟡 MEDIUM | **Platforms:** Web | **Files:** `vite.config.js`, new `sw.js`
**Status:** ⬜ NOT DONE — web-only benefit

#### Description
Add a service worker for offline caching of static assets and API responses, making the web build a proper PWA.

#### Acceptance Criteria
- [ ] Cache `index.html`, CSS, JS bundles, and all static thumbnails
- [ ] Cache API responses for: `/recipes`, `/categories`, `/meal-plan`, `/today`, `/shopping`
- [ ] Show an offline indicator banner when network is unavailable
- [ ] Background sync for actions performed offline (queue mutations, retry when online)
- [ ] Cache strategy: static assets = Cache First, API = Stale While Revalidate
- [ ] Add `manifest.json` enhancements for PWA install prompt
- [ ] Register service worker in `main.jsx`

---

## 8. Implementation Checklist

Reflects actual state as of 2026-07-28, branch `native-apps` (`7460968`).
"Code" = implemented and merged. iOS/Android columns = tested on a real device.

### ✅ Shipped — Tier 0 (done 2026-07-28)
| # | Requirement | Code | Web Verified | iOS Tested | Android Tested |
|---|-------------|------|--------------|-----------|----------------|
| 27 | REQ-027 Error Boundary | ☑ | ☑ injected-throw test | ☐ | ☐ |
| 12 | REQ-012 Search Debounce | ☑ | ☐ needs login | ☐ | ☐ |
| 8 | REQ-008 Nav Transitions | ☑ | ☑ computed CSS | ☐ | ☐ |
| 9 | REQ-009 Scroll-to-Top | ☑ | ☐ needs login | ☐ | ☐ |
| 2 | REQ-002 Haptic Feedback | ☑ | n/a (native-only) | ☐ | ☐ |
| 4 | REQ-004 Status Bar Theming | ☑ | n/a (native-only) | ☐ | ☐ |
| 3 | REQ-003 Chat Keyboard Fix | ☑ | n/a (native-only) | ☐ | ☐ |
| 14 | REQ-014 App Icon & Splash | ☑ ~90% | n/a | ☐ | ☐ |

### ⬜ Next up (recommended order)
| # | Requirement | Why next | Est. |
|---|-------------|----------|------|
| — | **Offline / network-error states** (new, not in v1.0) | App renders empty on backend outage | ~2 h |
| 10 | REQ-010 New Chat Button | Small, real gap | ~30 m |
| 11 | REQ-011 Emoji → SVG Icons | Fixes Android font rendering | ~2 h |
| 1 | REQ-001 Pull-to-Refresh | Expected native gesture | ~3 h |
| 13 | REQ-013 Meal Plan Picker polish | Cramped today | ~2 h |

### ⬜ Post-launch backlog
| # | Requirement | Notes |
|---|-------------|-------|
| 5 | REQ-005 Swipe Gestures | Gesture-conflict risk; do with 21 |
| 6 | REQ-006 Bottom Sheet Drag | Nice-to-have |
| 7 | REQ-007 Image Caching | Mostly moot — thumbnails are bundled |
| 15 | REQ-015 Dark Mode | Large surface area |
| 16 | REQ-016 Voice Input | |
| 18 | REQ-018 Push Notifications | Needs APNs + backend scheduler |
| 19 | REQ-019 Review Prompt | Needs real users |
| 20 | REQ-020 Planner Mobile View | |
| 21 | REQ-021 Context Menu | Depends on REQ-005 |
| 22 | REQ-022 Chat Skeletons | |
| 23 | REQ-023 Pagination | Revisit past ~100 recipes |
| 24 | REQ-024 Cooking Timer | |
| 25 | REQ-025 Export Shopping | |
| 28 | REQ-028 Service Worker | Web-only |

### 🚫 Recommended against
| # | Requirement | Reason |
|---|-------------|--------|
| 26 | REQ-026 Inline Styles → CSS | Refactor with regression risk across every screen and no user-visible benefit. Not pre-launch. |
| 17 | REQ-017 Biometric Lock | Recipe data doesn't warrant the friction + encrypted-storage work. |

### 🔴 Real submission blockers (tracked in `docs/LAUNCH-CHECKLIST.md`, NOT here)
| Item | Guideline |
|------|-----------|
| Sign in with Apple | 4.8 — Google-only login is an expected rejection |
| Working account deletion | 5.1.1(v) |
| Apple Developer enrollment | prerequisite for everything above |

---

## 9. Testing Matrix

### Device Coverage
| Device Type | iOS | Android |
|-------------|-----|---------|
| Small phone (5.4–5.8") | iPhone 13/14 mini, SE | Pixel 4a, Samsung A14 |
| Standard phone (6.1–6.3") | iPhone 14/15 | Pixel 7, Samsung S23 |
| Large phone (6.5–6.9") | iPhone 15 Pro Max | Pixel 7 Pro, Samsung S23 Ultra |
| Tablet | iPad Air, iPad Pro 11" | Samsung Tab S9, Pixel Tablet |

### Test Scenarios per Requirement
Each requirement must pass:
1. **Functional test** — Does it work as specified?
2. **Visual test** — Does it look correct on the device?
3. **Performance test** — No frame drops (>55fps), no jank
4. **Accessibility test** — Screen reader compatible, sufficient contrast
5. **Offline test** — Works or degrades gracefully without network
6. **Orientation test** — Works in portrait and landscape

---

## Appendix A — Capacitor Plugin Installation Summary

| Plugin | Requirement | Install Command |
|--------|-------------|-----------------|
| `@capacitor/haptics` | REQ-002 | `npm install @capacitor/haptics` |
| `@capacitor/keyboard` | REQ-003 | `npm install @capacitor/keyboard` |
| `@capacitor/status-bar` | REQ-004 | `npm install @capacitor/status-bar` |
| `@capacitor-community/http` | REQ-007 | `npm install @capacitor-community/http` |
| `@capacitor/push-notifications` | REQ-018 | `npm install @capacitor/push-notifications` |
| `@capacitor/share` | REQ-025 | `npm install @capacitor/share` |
| `@capacitor/filesystem` | REQ-007 (alt) | `npm install @capacitor/filesystem` |
| `@capacitor/app-rate` | REQ-019 | `npm install @capacitor/app-rate` |

After each install, run:
```bash
npx cap sync
```

---

*Document generated for FoodVault v1.0.0 — App Store Readiness Sprint*
