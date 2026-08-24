import {
  formatCount,
  parseSubmissionPosts,
  platformColor,
  platformLabel,
  postsFromLegacyLinks,
  sumEngagement,
  type SubmissionPost,
} from "@/lib/social-posts";

// โพสต์ที่ Influencer ส่งงานมา — แยกช่องทาง + ยอด engagement (migration 024)
// ใช้ในแถว talent ของหน้าโปรเจกต์ · งานเก่าที่เก็บเป็น URL ลอยๆ ก็อ่านได้
export function readPosts(pt: {
  submission_posts?: unknown;
  submission_links?: unknown;
}): SubmissionPost[] {
  const posts = parseSubmissionPosts(pt.submission_posts);
  return posts.length > 0 ? posts : postsFromLegacyLinks(pt.submission_links);
}

export function SubmittedPosts({ posts }: { posts: SubmissionPost[] }) {
  if (posts.length === 0) return null;
  const total = sumEngagement(posts);
  const hasNumbers = total.views > 0 || total.engagement > 0;

  return (
    <div className="space-y-1.5">
      {hasNumbers && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="font-semibold text-neutral-600">
            รวม {total.posts} โพสต์
          </span>
          <span className="text-neutral-500">
            👁 <b className="text-neutral-800">{formatCount(total.views)}</b> วิว
          </span>
          <span className="text-neutral-500">
            💬 <b className="text-neutral-800">{formatCount(total.engagement)}</b>{" "}
            engagement
          </span>
          {total.rate !== null && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
              ER {total.rate.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      <div className="space-y-1">
        {posts.map((p, i) => {
          const color = platformColor(p.platform);
          const stats = [
            p.views !== null && p.views !== undefined ? `${formatCount(p.views)} วิว` : null,
            p.likes !== null && p.likes !== undefined ? `${formatCount(p.likes)} ไลก์` : null,
            p.comments !== null && p.comments !== undefined
              ? `${formatCount(p.comments)} คอมเมนต์`
              : null,
            p.shares ? `${formatCount(p.shares)} แชร์` : null,
            p.saves ? `${formatCount(p.saves)} เซฟ` : null,
          ].filter(Boolean);
          return (
            <div key={i} className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span
                className="shrink-0 rounded-full px-2 py-0.5 font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {platformLabel(p.platform)}
              </span>
              {stats.length > 0 ? (
                <span className="text-neutral-600">{stats.join(" · ")}</span>
              ) : (
                <span className="text-neutral-400">ยังไม่ได้กรอกยอด</span>
              )}
              {/* ตัวเลขจาก YouTube API ต่างจากที่คนกรอกเอง — บอกให้รู้ว่าเชื่อถือได้ */}
              {p.source === "youtube" && (
                <span
                  title="ดึงจาก YouTube อัตโนมัติ"
                  className="rounded-full bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-600"
                >
                  ⟳ auto
                </span>
              )}
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-52 truncate text-neutral-400 underline underline-offset-2 hover:text-[#1D4ED8]"
              >
                {p.url.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
