import { z } from "zod";
import twitter from "twitter-text";
export type PostProvider = "x" | "linkedin" | "instagram" | "youtube";
export const postComposition = z
  .object({
    copy: z.string().max(5000),
    title: z.string().max(150),
    imageIds: z.array(z.string().uuid()).max(10).default([]),
    imageAlts: z.array(z.string().max(1000)).max(10).default([]),
    thumbnailId: z.string().uuid().optional(),
    madeForKids: z.boolean().default(false),
    tags: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  })
  .strict();
export type PostComposition = z.infer<typeof postComposition>;
export type PostImage = {
  id: string;
  name: string;
  hash: string;
  bytes: number;
  width: number;
  height: number;
  mime: "image/jpeg";
  createdAt: string;
};
export type PostVideo = {
  width: number;
  height: number;
  duration: number;
  bytes: number;
};
export const postText = (copy: string, link: string) =>
  `${copy.trim()}\n\n${link}`;
export const weightedLength = (text: string) =>
  twitter.parseTweet(text).weightedLength;
export function postPreflight(
  provider: PostProvider,
  composition: PostComposition,
  link: string,
  images: PostImage[],
  video?: PostVideo,
  thumbnail?: PostImage,
) {
  const errors: string[] = [],
    warnings: string[] = [],
    text = postText(composition.copy, link);
  const count = provider === "x" ? weightedLength(text) : text.length;
  const limit = { x: 280, linkedin: 3000, instagram: 2200, youtube: 5000 }[
    provider
  ];
  if (!composition.copy.trim()) errors.push("Write the post text first.");
  if (count > limit)
    errors.push(
      `Post uses ${count} of ${limit} characters including its destination link.`,
    );
  if (provider === "x" && !twitter.parseTweet(text).valid)
    errors.push(
      "X rejects this text. Check its length and unsupported characters.",
    );
  if (composition.imageIds.length !== images.length)
    errors.push("An attached image is unavailable. Select it again.");
  if (new Set(composition.imageIds).size !== composition.imageIds.length)
    errors.push("Attach each image once.");
  if (video && images.length)
    errors.push("Choose a video or images for this post, not both.");
  if (provider === "x" && images.length > 4)
    errors.push("X posts support up to four images in this composer.");
  if (provider === "youtube") {
    if (!video) errors.push("YouTube needs an approved video.");
    if (
      !composition.title.trim() ||
      composition.title.length > 100 ||
      /[<>]/.test(composition.title)
    )
      errors.push(
        "YouTube needs a title of 1–100 characters without angle brackets.",
      );
    if (/[<>]/.test(text))
      errors.push("YouTube descriptions cannot contain angle brackets.");
    if (composition.tags.join(",").length > 450)
      errors.push("Shorten the YouTube tags to fit the upload budget.");
    if (images.length)
      errors.push("Use the YouTube thumbnail field instead of post images.");
    if (
      thumbnail &&
      (thumbnail.bytes > 2 * 1024 * 1024 || thumbnail.width < 640)
    )
      errors.push(
        "Use a thumbnail at least 640px wide and no larger than 2 MB.",
      );
    if (
      thumbnail &&
      Math.abs(thumbnail.width / thumbnail.height - 16 / 9) > 0.05
    )
      warnings.push("A 16:9 thumbnail avoids unexpected YouTube cropping.");
  } else if (composition.thumbnailId)
    errors.push("Custom thumbnails in this composer are for YouTube only.");
  if (provider === "instagram") {
    if (!video && !images.length)
      errors.push("Instagram needs a photo, carousel or Reel.");
    for (const image of images) {
      const ratio = image.width / image.height;
      if (
        image.width < 320 ||
        image.width > 1440 ||
        ratio < 0.8 ||
        ratio > 1.91
      )
        errors.push(
          `${image.name}: use a 320–1440px wide photo between 4:5 and 1.91:1.`,
        );
    }
    if (
      images.length > 1 &&
      images.some(
        (i) =>
          Math.abs(i.width / i.height - images[0].width / images[0].height) >
          0.02,
      )
    )
      errors.push(
        "Use matching image ratios so the Instagram carousel does not crop its slides differently.",
      );
    if (
      video &&
      (video.duration < 3 ||
        video.width / video.height < 0.55 ||
        video.width / video.height > 0.57)
    )
      errors.push("Use a portrait 9:16 Reel of at least 3 seconds.");
    warnings.push(
      "Links in Instagram captions are plain text, not clickable destinations.",
    );
  }
  if (video && provider === "linkedin" && video.duration < 3)
    errors.push("LinkedIn videos need at least 3 seconds in this composer.");
  if (images.length && images.some((_, i) => !composition.imageAlts[i]?.trim()))
    warnings.push("Add descriptive alt text to make your images accessible.");
  return { errors: [...new Set(errors)], warnings, count, limit, text };
}
