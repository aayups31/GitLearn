# GitLearn release design

## Premise

A self-learning workspace that connects the lesson you watch to the code you write and the progress you keep. The first release keeps the GitLearn name and focuses on Udemy. The public web is marketing and documentation; the Windows download contains the workspace and first-run setup.

## Direction

Software-led editorial design, informed by Linear's product density and Claude's clear contextual assistance. The signature is an actual three-pane GitLearn workspace, rather than a generated illustration or video. This deliberately adapts the 10k-websites cinematic defaults to the product. No paid generation is needed.

Customer-language research: recurring learner concerns are being stuck watching tutorials, knowing how to follow along but not build independently, and losing context between practice sessions. References: https://www.reddit.com/r/learnprogramming/comments/1e40e8g and https://www.reddit.com/r/learnprogramming/comments/qbduch. These inform the problem and workflow; they are not endorsements or testimonials.

## Tokens and typography

- Canvas #101216; raised surface #181c24; text #f3f5fa; secondary text #a5adbd.
- Blue #7399ff for focus and rare emphasis; primary button #456fe3 with white text.
- Display: Manrope, self-hosted variable, weights 500 through 700. Body: existing self-hosted Inter. Mono: system monospace.
- Spacious editorial copy, compact product detail, mild rounded corners, consistent thin separators. No repeated boxed feature grid.

## Page, copy, and pacing

1. Header: mark, Product, How it works, FAQ, Download. Hero: “Go beyond the lesson.” Supporting copy describes Udemy, local coding, notes, and sourced help. Primary action: Download GitLearn, opening the download section. Secondary: Explore the workspace.
2. Actual workspace proof with an explicit example caption. Tall desktop image; a scrollable, labeled detail on narrow screens rather than illegible scaled text.
3. An editorial problem statement followed by three connected workflow steps: Watch with context, Make it your own, Keep what you learn. Distinct layouts from the hero.
4. Designed interactive moment: choose Code help or Ask the course, see the corresponding example answer and source. Clearly labeled demonstration. No fake live AI or automatic editing claim.
5. Local-first explanation with a simple folder tree: one learning folder, multiple courses, optional one private GitHub repository.
6. Complete start guide: install app and Git, choose parent folder, optionally add API key, install and pair extension, open Udemy, start lesson and code, review checkpoint, optionally sync GitHub.
7. FAQ: VS Code optional, GitHub optional, supported runtimes, explicit transcript import and limitations, API billing, Windows preview signing.
8. Download: actual release assets and current store state. No invented store URL, reviews, customer logos, pricing, metrics, or availability. Footer includes privacy and source repository.

## Motion and interaction

One subtle entrance for the workspace proof; static content remains visible without JavaScript. No scroll hijacking, pinned hero, ongoing animation, or video downloads. Hover and focus transition only opacity or transform. Live reduced-motion preferences disable motion. Assistant example switches are keyboard operable and expose selection and panel state.

## Delivery and QA

Plain static HTML/CSS/JS in src/site, independently deployable dist/site. Workspace React build remains local. Relative assets support root or subdirectory hosting. Self-hosted licensed fonts. Sources and download URLs are release metadata, separate from local workspace API. App and extension archives contain no developer .env or local data.

Verify desktop 1280/1440 and mobile 375/390, keyboard navigation, no-JS completion, live reduced motion, every link/action, contrast, console errors, overflow, installer launch, native directory picker/API-key boundary, local editor execution, first-run wizard, and existing course/checkpoint/RAG regressions. Scan copy for em dashes and stock language. Record measured artifact sizes and checks in release notes. Public deployment follows review of the finished artifact.

## OutClass visual refresh — October 11, 2026

The public landing now uses an original blue ribbon that rises out of a loop, oversized two-line typography, a quieter navigation bar, a larger workspace introduction, and a pale editorial section for the tutorial-loop problem. Inspiration: Linear's software detail, Framer's visual confidence, and Scale's generous editorial pacing. No reference assets or customer claims are copied.

The SVG artwork is local and lightweight. Existing GSAP entrance, scroll parallax, workspace perspective, chapter progress, and reduced-motion handling are retained. All download/setup details and preview availability remain explicit. Verified at 1440px and 390px visually; the three site Playwright tests pass, including narrow viewports, keyboard tabs, no JavaScript, blocked GSAP, and changing reduced-motion preferences.
