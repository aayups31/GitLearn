# GitLearn frontend

## Direction

The primary reference is [Linear's product interface](https://linear.app/), inspected directly in its public product showcase. The earlier Notion-style illustration was removed after feedback. Mobbin MCP was available, but its searches required a paid plan, so no Mobbin screens were used.

GitLearn uses compact navigation, restrained type, thin borders, and purposeful surfaces. Blue remains the accent and primary action color. Light mode uses a cool white canvas; dark mode uses charcoal surfaces with clear text and control contrast. Inter is self-hosted; its license lives beside the font in `src/ui/assets/fonts`. The branch mark is an original SVG. The overview uses actual workspace counts and connection states instead of a decorative diagram.

## Appearance

The sun/moon control in the top bar switches between light and dark mode. The first visit follows the system's color preference. An explicit choice persists in this browser's local storage. The external `public/appearance.js` script applies the preference before rendering, respecting the existing self-only script policy. No server setting, account, or additional dependency is required. Storage failures do not prevent switching in the current tab. The extension popup independently follows the system's color preference.

## Screens

- Overview shows course and checkpoint counts and current session status. First-time setup includes an actionable checklist with actual connection states and clearly optional integrations. Once configured, the focus shifts to the current session, courses, and recent history from the companion.
- Courses use ruled rows with lesson context and direct actions, rather than a grid of decorative cards.
- A coding session places lesson context and the selected folder beside optional notes. Review remains explicit before saving.
- Checkpoints use dated rows with commit context and the actual local or remote save state.
- Setup follows three numbered sections: local history, extension pairing, and optional GitHub.
- The extension popup shares the wordmark, colors, typography direction, and restrained controls.
- `/welcome` is a separate dark product page inspired by Linear's landing page: oversized restrained type, blue actions, a clearly labeled example workspace, a multi-course archive example, seven complete setup steps, copyable commands, and expandable questions. It explains the current local build without fabricated customer claims or a download button for an unpublished extension. Desktop and mobile layouts link directly to workspace Settings.

## Interaction and verification

Dialogs focus the first form field, keep Tab and Shift+Tab inside the dialog, close with Escape, and restore focus to the opener. A checkpoint cannot be dismissed while its save is in flight. Forms prevent repeated submission while busy. Navigation exposes the active page, narrow screens use a bottom navigation bar, focus indicators remain visible, and reduced-motion preferences are respected.

The browser workflow checks setup, manual Udemy entry, mirroring, local coding, note entry, checkpoint review, saving the reviewed bytes, secret-file exclusion, keyboard dialog behavior, and mobile overflow. Both themes are captured across these screens. A separate appearance check verifies the initial system preference and an explicit choice surviving reload. The extension workflow loads the real unpacked extension and checks pairing, accessible Udemy metadata, pending-event replay, and the popup in both themes. These tests use isolated data with API keys disabled.
