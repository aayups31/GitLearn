# Chrome Web Store release

OutClass 0.4.2 was submitted on October 11, 2026. The developer dashboard confirms **Pending review** for the existing item `iaokfcjeghdefpgcgbcomiehhogbkbcp`, with automatic publication after approval. The owner requested the rename and explicitly approved replacement of the two old listing images and resubmission. The original GitLearn 0.4.1 review was canceled to unlock the item; no second item was created. Google approval and public availability remain pending. Official steps: https://developer.chrome.com/docs/webstore/publish.

The OutClass title comes from the accepted 0.4.2 package. Its description, icon, 1280x800 screenshot rendered from the actual popup with illustrative course context, renamed GitHub support URL, and reviewer instructions are saved. The Education/English category, free/public distribution, verified publisher contact, and unchanged permission/data handling remain in place. The three previously approved privacy certifications were preserved; they were not rechecked or expanded during this update.

## Upload package

The 0.4.2 Windows app and extension keep the same pairing and permission scope. The privacy page identifies the rename. The accepted package is `dist/releases/OutClass-Chrome-0.4.2.zip`; its SHA-256 is recorded in [release validation](release-validation.md). Do not create a second item or claim OutClass is approved.

Build and run `npm run package:extension` to produce the extension ZIP. Future changes update this same item after the current review is resolved. The older GitLearn 0.4.1 package remains available in its historical GitHub release. Packages contain the MV3 manifest, built background/content/popup scripts, popup assets, and icons. They contain no API key, source environment, server, local data, or Node modules.

## Suggested listing

Name: OutClass - Udemy learning companion

Short description: Connect your Udemy lessons with your own local code, notes, and Git checkpoints.

Detailed description:

OutClass connects your Udemy course to a local learning workspace on Windows. Follow a lesson, practice in the built-in editor or your existing local code folder, and save reviewed code and notes as Git checkpoints. GitHub is optional.

The extension keeps accessible course titles, lecture structure, current lesson, and completion indicators in context. It pairs with the OutClass app using a one-time connection code. Pending course updates wait locally until the app reconnects.

For course-specific AI help, open the lesson's transcript panel and explicitly choose Import visible transcript. The transcript is added to your local course library. AI requires your own OpenAI API key in the desktop app; the extension never receives that key. OutClass does not download videos or automatically import lecture text.

Install the companion first, then open its setup guide and pair the extension. OutClass is independent of Udemy and is not affiliated with or endorsed by Udemy.

## Permissions and disclosures

Single purpose: bring the user's accessible Udemy lesson context and explicitly imported visible transcript into the paired local OutClass learning workspace.

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

1. Use Windows x64 with Git for Windows installed. Download the current companion from the public homepage or GitHub Releases, install it, and open OutClass (previously OutClass). This preview installer is unsigned. The submitted OutClass extension also pairs with this companion; its protocol and permissions are unchanged.
2. Follow first-run setup and select an empty parent learning folder. Skip optional OpenAI and GitHub connection. There is no OutClass account, username, or password.
3. Keep the companion open. In Setup, find its connection code. Open the extension popup, enter that code, and connect. The popup should show the connected companion.
4. Open a Udemy course page accessible to you. Course titles and available lesson metadata appear in the popup and companion. Paid course purchases and OpenAI access are not required for pairing or accessible metadata; authenticated lecture/transcript access follows the reviewer's own Udemy permissions.
5. On an accessible lesson with a transcript, open Udemy's transcript panel, then choose Import visible transcript in the extension. Inspect the imported source under that course in OutClass. Closed/unavailable transcripts produce an explanation rather than a download.
6. Close the companion and visit another accessible lesson. The popup reports pending local updates. Reopen OutClass and retry; queued context is delivered. The extension never uploads this context to a developer server.
7. Open my workspace focuses the already running desktop app. The extension credential can submit course context/imported text and read minimal connection status; it cannot edit files, run code, invoke AI, or change repositories.

After approval, copy the real Chrome Web Store item URL into `src/site/assets/release.json`, rebuild, and publish the updated site. Until then, both site and app explain Load unpacked accurately.
