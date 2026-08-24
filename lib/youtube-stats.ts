import "server-only";
import { youtubeVideoId } from "@/lib/social-posts";

// ดึงยอดวิว/ไลก์/คอมเมนต์ของคลิป YouTube สาธารณะ
//
// YouTube เป็นแพลตฟอร์มเดียวที่ดึงได้ด้วย API key อย่างเดียว ไม่ต้องให้เจ้าของ
// คลิปมากดอนุญาต (IG/TikTok/Facebook ต้องให้ influencer แต่ละคน OAuth เข้ามา)
//
// ตั้งค่า: YOUTUBE_API_KEY (Google Cloud → YouTube Data API v3 → Create API key)
// ถ้าไม่ตั้ง ระบบจะข้ามไปเงียบๆ แล้วใช้ตัวเลขที่กรอกมือแทน — ไม่พัง
export type YoutubeStats = {
  views: number | null;
  likes: number | null;
  comments: number | null;
};

export async function fetchYoutubeStats(url: string): Promise<YoutubeStats | null> {
  const key = process.env.YOUTUBE_API_KEY;
  const id = youtubeVideoId(url);
  if (!key || !id) return null;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${id}&key=${key}`,
      { next: { revalidate: 1800 } }, // cache 30 นาที กันยิงซ้ำถี่ๆ
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      items?: { statistics?: Record<string, string> }[];
    };
    const s = body.items?.[0]?.statistics;
    if (!s) return null; // คลิปถูกลบ/เป็นส่วนตัว
    const n = (v?: string) => (v === undefined ? null : Number(v));
    return {
      views: n(s.viewCount),
      likes: n(s.likeCount), // ปิดยอดไลก์ไว้ = ไม่มีค่านี้
      comments: n(s.commentCount),
    };
  } catch {
    return null;
  }
}
