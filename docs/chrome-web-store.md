# Chrome Web Store release

Version 0.4.1 was submitted on October 10, 2026. The developer dashboard confirms **Pending review** for item `iaokfcjeghdefpgcgbcomiehhogbkbcp`. The publisher enabled Google two-step verification, verified the public contact email, and explicitly approved all three privacy certifications. The description, Education/English category, icon, screenshot, homepage/support URLs, permission justifications, data categories, privacy-policy URL, and reviewer instructions are saved. Distribution is free and public, with automatic publication selected after approval. Submission is complete; Google approval and public availability remain pending. Official steps: https://developer.chrome.com/docs/webstore/publish.

## Upload package

Build and run `npm run package:extension`. Upload `dist/releases/GitLearn-Chrome-0.4.1.zip` when creating a new item in the developer dashboard. It contains the MV3 manifest, built background/content/popup scripts, popup assets, and icons. It contains no API key, source environment, server, local data, or Node modules.

## Suggested listing

Name: GitLearn - Udemy learning companion

Short description: Connect your Udemy lessons with your own local code, notes, and Git checkpoints.

Detailed description:

GitLearn connects your Udemy course to a local learning workspace on Windows. Follow a lesson, practice in the built-in editor or your existing local code folder, and save reviewed code and notes as Git checkpoints. GitHub is optional.

The extension keeps accessible course titles, lecture structure, current lesson, and completion indicators in context. It pairs with the GitLearn app using a one-time connection code. Pending course updates wait locally until the app reconnects.

For course-specific AI help, open the lesson's transcript panel and explicitly choose Import visible transcript. The transcript is added to your local course library. AI requires your own OpenAI API key in the desktop app; the extension never receives that key. GitLearn does not download videos or automatically import lecture text.

Install the companion first, then open its setup guide and pair the extension. GitLearn is independent of Udemy and is not affiliated with or endorsed by Udemy.

## Permissions and disclosures

Single purpose: bring the user's accessible Udemy lesson context and explicitly imported visible transcript into the paired local GitLearn learning workspace.

- storage: retain the pairing credential, latest course context, and pending local updates.
- alarms: retry pending local updates when the companion reconnects.
- Udemy course-page host permissions: read accessible course/lesson metadata and, only on user action, the open visible transcript panel. Content scripts are limited to those course URLs.
- 127.0.0.1:47831 host permission: communicate with the user's local companion. Paired extension credentials cannot edit code, use AI, or change repositories. They can submit course material/context, read minimal connection status, and focus an already running desktop workspace.
- No remote code, broad browser history access, videos, credentials, cookies, advertising, or analytics.

Review the dashboard's current privacy form against actual handling. Course-page URLs/context fall within website content or browsing activity; imported transcript text is website content. Disclose local processing and optional OpenAI/GitHub processing in the companion. Never select a no-data declaration that contradicts these behaviors. Public homepage: https://git-learn-black.vercel.app/. Public privacy policy: https://git-learn-black.vercel.app/privacy.

The submitted listing declares authentication information (local pairing code/token), web history (Udemy course-page URLs/context), user activity (current lesson/completion context), and website content (course metadata and explicitly imported transcript text). There is no general browser history permission or Udemy account access. Chrome requires disclosure even for local handling: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq. The publisher approved the three limited-use certifications at submission time.

The 128px icon is in extension/static/icons/icon-128.png. A ready 1280x800 listing screenshot is in docs/store-assets/extension-1280x800.png. It uses the actual tested popup with an example course and no private learner data. The optional promotional tile is 440x280. Describe what is visible; do not imply automatic video access or support beyond Udemy.

Complete account verification, listing category/language, privacy practices, the public privacy-policy URL, and tester instructions before requesting store review. Explain that reviewers need the Windows companion running, how to pair it, and that no paid course content or API key is required to test metadata pairing. An API key is needed only for optional AI inside the companion.

## Reviewer walkthrough

1. Use Windows x64 with Git for Windows installed. Download the 0.4.1 companion from the public homepage or GitHub Releases, install it, and open GitLearn. This preview installer is unsigned.
2. Follow first-run setup and select an empty parent learning folder. Skip optional OpenAI and GitHub connection. There is no GitLearn account, username, or password.
3. Keep the companion open. In Setup, find its connection code. Open the extension popup, enter that code, and connect. The popup should show the connected companion.
4. Open a Udemy course page accessible to you. Course titles and available lesson metadata appear in the popup and companion. Paid course purchases and OpenAI access are not required for pairing or accessible metadata; authenticated lecture/transcript access follows the reviewer's own Udemy permissions.
5. On an accessible lesson with a transcript, open Udemy's transcript panel, then choose Import visible transcript in the extension. Inspect the imported source under that course in GitLearn. Closed/unavailable transcripts produce an explanation rather than a download.
6. Close the companion and visit another accessible lesson. The popup reports pending local updates. Reopen GitLearn and retry; queued context is delivered. The extension never uploads this context to a developer server.
7. Open my workspace focuses the already running desktop app. The extension credential can submit course context/imported text and read minimal connection status; it cannot edit files, run code, invoke AI, or change repositories.

After approval, copy the real Chrome Web Store item URL into `src/site/assets/release.json`, rebuild, and publish the updated site. Until then, both site and app explain Load unpacked accurately.
