import React, { useEffect, useState } from "react";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Send,
  Bookmark,
  MoreHorizontal,
  ThumbsUp,
  Globe2,
  ChevronLeft,
  ChevronRight,
  Play,
  Share2,
  Monitor,
  Smartphone,
} from "lucide-react";
import type { PostComposition, PostImage, PostProvider } from "../social-post";
import "./social-composer.css";
type API = <T>(route: string, body?: unknown) => Promise<T>;
export const platformNames = {
  x: "X",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
};
export function SocialPostPreview({
  api,
  provider,
  accountName,
  text,
  title,
  images = [],
  imageAlts = [],
  mediaJobId,
  thumbnail,
  privacy,
  compact = false,
}: {
  api: API;
  provider: PostProvider;
  accountName: string;
  text: string;
  title: string;
  images?: PostImage[];
  imageAlts?: PostComposition["imageAlts"];
  mediaJobId?: string;
  thumbnail?: PostImage;
  privacy?: string;
  compact?: boolean;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop"),
    [expanded, setExpanded] = useState(false),
    [slide, setSlide] = useState(0),
    [playing, setPlaying] = useState(false),
    [watch, setWatch] = useState(false),
    [dark, setDark] = useState(provider === "x"),
    [urls, setUrls] = useState<Record<string, string>>({}),
    [reload, setReload] = useState(0),
    [error, setError] = useState("");
  const imageKey = [
    ...images.map((i) => i.id),
    ...(thumbnail ? [thumbnail.id] : []),
  ].join(",");
  useEffect(() => {
    let live = true;
    setUrls({});
    setError("");
    setSlide(0);
    setPlaying(false);
    async function load() {
      const ids = [...new Set(imageKey.split(",").filter(Boolean))];
      const entries = await Promise.all(
        ids.map(async (id) => [
          id,
          (
            await api<{ url: string }>(
              `expansion/social-images/${id}/access`,
              {},
            )
          ).url,
        ]),
      );
      if (mediaJobId)
        entries.push([
          "video",
          (
            await api<{ url: string }>(`expansion/media/${mediaJobId}/access`, {
              kind: "export",
            })
          ).url,
        ]);
      if (live) setUrls(Object.fromEntries(entries));
    }
    void load().catch((e) => {
      if (live) setError(e.message);
    });
    return () => {
      live = false;
    };
  }, [api, imageKey, mediaJobId, reload]);
  const index = Math.min(slide, Math.max(0, images.length - 1));
  const avatar = (
    <span className="social-avatar" aria-hidden="true">
      {accountName.slice(0, 1).toUpperCase()}
    </span>
  );
  const identity = (
    <div className="social-identity">
      {avatar}
      <div>
        <strong>{accountName}</strong>
        <span>
          {provider === "linkedin" ? (
            <>
              Just now · <Globe2 size={11} />
            </>
          ) : provider === "instagram" ? (
            "Original post"
          ) : (
            "Preview · not published"
          )}
        </span>
      </div>
      <MoreHorizontal size={20} />
    </div>
  );
  const copy = (
    <div className={`social-copy ${expanded ? "expanded" : ""}`}>
      <p>{text}</p>
      {text.length > (provider === "instagram" ? 140 : 240) &&
        provider !== "x" && (
          <button
            type="button"
            className="social-more"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? "Show less"
              : provider === "youtube"
                ? "Show description"
                : "…more"}
          </button>
        )}
    </div>
  );
  const visuals = (
    <>
      {error && (
        <p role="alert" className="social-preview-error">
          {error}
        </p>
      )}
      {mediaJobId &&
        urls.video &&
        (provider === "youtube" && thumbnail && !playing ? (
          <button
            className="social-video-cover"
            type="button"
            aria-label="Play approved video"
            onClick={() => setPlaying(true)}
          >
            <img src={urls[thumbnail.id]} alt="Selected YouTube thumbnail" />
            <span>
              <Play fill="currentColor" size={30} />
            </span>
          </button>
        ) : (
          <video
            key={urls.video}
            className="social-video"
            controls
            playsInline
            preload="metadata"
            autoPlay={playing}
            poster={thumbnail ? urls[thumbnail.id] : undefined}
            src={urls.video}
            aria-label="Approved post video"
          />
        ))}
      {!mediaJobId &&
        images.length > 0 &&
        (provider === "instagram" ? (
          <div className="social-carousel">
            <img
              src={urls[images[index].id]}
              alt={imageAlts[index] || images[index].name}
            />
            {images.length > 1 && (
              <>
                <span className="social-slide-number">
                  {index + 1}/{images.length}
                </span>
                <div className="social-slide-controls">
                  <button
                    type="button"
                    aria-label="Previous photo"
                    disabled={index === 0}
                    onClick={() => setSlide(index - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    disabled={index === images.length - 1}
                    onClick={() => setSlide(index + 1)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div
            className={`social-image-grid count-${Math.min(images.length, 4)}`}
          >
            {images.slice(0, 4).map((image, i) => (
              <div key={image.id}>
                <img src={urls[image.id]} alt={imageAlts[i] || image.name} />
                {i === 3 && images.length > 4 && (
                  <span>+{images.length - 4}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      {!mediaJobId && !images.length && provider === "instagram" && (
        <div className="social-empty-media">
          Add a photo, carousel or Reel
          <br />
          <small>Your selected media appears here.</small>
        </div>
      )}
      {!mediaJobId && provider === "youtube" && (
        <div className="social-empty-media">
          <Play size={30} />
          <span>Select an approved video</span>
        </div>
      )}
    </>
  );
  return (
    <section
      className={`social-preview-shell ${compact ? "compact" : ""}`}
      aria-label={`${platformNames[provider]} post preview`}
    >
      <div className="social-preview-toolbar">
        <strong>{platformNames[provider]} preview</strong>
        <div role="group" aria-label="Preview display">
          <button
            type="button"
            title="Desktop preview"
            aria-label="Desktop preview"
            aria-pressed={device === "desktop"}
            onClick={() => setDevice("desktop")}
          >
            <Monitor size={15} />
          </button>
          <button
            type="button"
            title="Mobile preview"
            aria-label="Mobile preview"
            aria-pressed={device === "mobile"}
            onClick={() => setDevice("mobile")}
          >
            <Smartphone size={15} />
          </button>
          <button type="button" onClick={() => setDark(!dark)}>
            {dark ? "Light" : "Dark"}
          </button>
          {(imageKey || mediaJobId) && (
            <button type="button" onClick={() => setReload((r) => r + 1)}>
              Reload media
            </button>
          )}
        </div>
      </div>
      {provider === "youtube" && (
        <div className="social-youtube-tabs">
          <button
            type="button"
            aria-pressed={!watch}
            onClick={() => setWatch(false)}
          >
            Home feed
          </button>
          <button
            type="button"
            aria-pressed={watch}
            onClick={() => setWatch(true)}
          >
            Watch page
          </button>
        </div>
      )}
      <div className={`social-preview-stage ${device}`}>
        <div
          className={`social-post ${provider} ${dark ? "dark" : "light"} ${watch ? "watch" : "feed"}`}
        >
          {provider === "youtube" ? (
            <>
              <div className="social-youtube-media">{visuals}</div>
              <h3 className="social-video-title">
                {title || "Your video title"}
              </h3>
              {identity}
              <div className="social-youtube-meta">
                {privacy || "unlisted"} · Preview
              </div>
              {(watch || expanded) && copy}
              {!watch && !expanded && (
                <button
                  type="button"
                  className="social-description-toggle"
                  onClick={() => setExpanded(true)}
                >
                  Preview description
                </button>
              )}
              {watch && (
                <div className="social-actions" aria-hidden="true">
                  <ThumbsUp size={19} />
                  <span>Like</span>
                  <Share2 size={18} />
                  <span>Share</span>
                </div>
              )}
            </>
          ) : (
            <>
              {identity}
              {provider !== "instagram" && copy}
              {visuals}
              {provider === "linkedin" ? (
                <div className="social-actions" aria-hidden="true">
                  <ThumbsUp size={19} />
                  <span>Like</span>
                  <MessageCircle size={19} />
                  <span>Comment</span>
                  <Repeat2 size={19} />
                  <Send size={19} />
                </div>
              ) : (
                <div className="social-actions" aria-hidden="true">
                  <MessageCircle size={19} />
                  {provider === "x" && <Repeat2 size={19} />}
                  <Heart size={21} />
                  <Send size={19} />
                  <Bookmark size={19} />
                </div>
              )}
              {provider === "instagram" && (
                <div className="social-instagram-caption">
                  <strong>{accountName}</strong>
                  {copy}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <p className="social-preview-note">
        Exact text and selected media. Final layout, link cards and video
        processing may vary on {platformNames[provider]}.
      </p>
    </section>
  );
}
