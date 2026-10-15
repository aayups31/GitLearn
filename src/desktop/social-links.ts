// The native shell opens only official consent endpoints and recognizable post links.
export function approvedSocialLink(url: URL) {
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const auth: Record<string, string> = {
    "accounts.google.com": "/o/oauth2/v2/auth",
    "www.linkedin.com": "/oauth/v2/authorization",
    "x.com": "/i/oauth2/authorize",
    "www.instagram.com": "/oauth/authorize",
  };
  if (auth[url.hostname] === url.pathname) return true;
  return (
    (url.hostname === "www.youtube.com" && url.pathname === "/watch") ||
    (url.hostname === "www.linkedin.com" &&
      url.pathname.startsWith("/feed/update/")) ||
    (url.hostname === "x.com" &&
      /^\/i\/web\/status\/\d+\/?$/.test(url.pathname)) ||
    (url.hostname === "www.instagram.com" &&
      /^\/(p|reel)\/[\w-]+\/?$/.test(url.pathname))
  );
}
