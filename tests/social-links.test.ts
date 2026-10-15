import { it, expect } from "vitest";
import { approvedSocialLink } from "../src/desktop/social-links";
it("opens official social consent and post links without allowing arbitrary hosts or credentials", () => {
  for (const url of [
    "https://accounts.google.com/o/oauth2/v2/auth?state=a",
    "https://www.linkedin.com/oauth/v2/authorization",
    "https://x.com/i/oauth2/authorize",
    "https://www.instagram.com/oauth/authorize",
    "https://www.youtube.com/watch?v=123",
    "https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123/",
    "https://x.com/i/web/status/123",
    "https://www.instagram.com/reel/abc/",
  ])
    expect(approvedSocialLink(new URL(url))).toBe(true);
  for (const url of [
    "https://accounts.google.com.evil.test/o/oauth2/v2/auth",
    "http://x.com/i/oauth2/authorize",
    "https://secret@www.linkedin.com/oauth/v2/authorization",
    "https://x.com/settings",
    "https://www.instagram.com/direct/inbox/",
  ])
    expect(approvedSocialLink(new URL(url))).toBe(false);
});
