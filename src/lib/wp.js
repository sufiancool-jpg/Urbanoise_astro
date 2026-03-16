import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const mediaDir = path.join(process.cwd(), "public", "wp-media");

const buildBasicAuthHeader = (user, pass) => {
  if (!user || !pass) return {};
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return { Authorization: `Basic ${token}` };
};

export const getWpAuthHeader = () => {
  const authPairs = [
    [import.meta.env.WP_DIRECTORY_USER, import.meta.env.WP_DIRECTORY_PASS],
    [import.meta.env.WP_BASIC_USER, import.meta.env.WP_BASIC_PASS],
    [import.meta.env.WP_USER, import.meta.env.WP_PASS],
  ];

  const [user, pass] = authPairs.find(([authUser, authPass]) => authUser && authPass) ?? [];
  return buildBasicAuthHeader(user, pass);
};

export const cacheFeaturedImage = async (url, id, headers = {}) => {
  if (!url) return "";
  try {
    await mkdir(mediaDir, { recursive: true });
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname) || ".jpg";
    const safeId = id ? String(id).replace(/[^a-z0-9-_]/gi, "") : "image";
    const filename = `${safeId}${ext}`;
    const filePath = path.join(mediaDir, filename);

    if (!existsSync(filePath)) {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Image fetch failed: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      await writeFile(filePath, Buffer.from(arrayBuffer));
    }

    return `/wp-media/${filename}`;
  } catch (error) {
    console.error("Unable to cache featured image:", error);
    return "";
  }
};
