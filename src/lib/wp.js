import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const mediaDir = path.join(process.cwd(), "public", "wp-media");

export const getWpAuthHeader = () => {
  const wpUser = import.meta.env.WP_USER;
  const wpPass = import.meta.env.WP_PASS;
  if (!wpUser || !wpPass) return {};
  const token = Buffer.from(`${wpUser}:${wpPass}`).toString("base64");
  return { Authorization: `Basic ${token}` };
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
