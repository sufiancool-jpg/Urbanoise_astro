import { createHash } from "node:crypto";
import { cacheFeaturedImage, getWpAuthHeader } from "./wp.js";

const POSTS_API_BASE = "https://urbanoise.com/wpheadless/wp-json/wp/v2/posts?per_page=100&_embed";

const sortNewestFirst = (a, b) => {
  const aDate = new Date(a?.date ?? 0).getTime();
  const bDate = new Date(b?.date ?? 0).getTime();
  return bDate - aDate;
};

const fetchPostsPage = async (page, headers) => {
  const response = await fetch(`${POSTS_API_BASE}&page=${page}`, { headers });
  if (!response.ok) return { posts: [], totalPages: 0 };

  const posts = await response.json();
  const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? "1");
  return { posts: Array.isArray(posts) ? posts : [], totalPages };
};

const withCachedFeaturedImage = async (post, headers) => {
  const featured = post?._embedded?.["wp:featuredmedia"]?.[0];
  const featuredUrl = featured?.source_url ?? "";
  const cacheFingerprint = createHash("sha1")
    .update(`${featured?.id ?? ""}|${featuredUrl}|${post?.modified ?? ""}`)
    .digest("hex")
    .slice(0, 12);
  const cacheKey = `${post?.id ?? "post"}-${cacheFingerprint}`;
  const localFeaturedUrl = await cacheFeaturedImage(featuredUrl, cacheKey, headers);
  return { ...post, __localFeaturedUrl: localFeaturedUrl };
};

export const fetchAllWpPosts = async () => {
  const headers = getWpAuthHeader();
  const { posts: firstPagePosts, totalPages } = await fetchPostsPage(1, headers);
  if (!firstPagePosts.length) return [];

  const allPosts = [...firstPagePosts];

  for (let page = 2; page <= totalPages; page += 1) {
    const { posts } = await fetchPostsPage(page, headers);
    if (!posts.length) break;
    allPosts.push(...posts);
  }

  const postsWithCachedMedia = await Promise.all(
    allPosts.map((post) => withCachedFeaturedImage(post, headers))
  );

  return postsWithCachedMedia.sort(sortNewestFirst);
};
