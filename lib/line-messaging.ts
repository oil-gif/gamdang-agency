import "server-only";

// LINE OA @gamdangmodeling — Messaging API. คนละ channel กับ LIFF/Login
// (LINE_CHANNEL_ID/SECRET ใช้ verify ID token เท่านั้น ห้ามสลับกัน)
const accessToken = process.env.LINE_MESSAGING_ACCESS_TOKEN;

type LineMessage = Record<string, unknown>;

export async function pushLineMessage(to: string, messages: LineMessage[]) {
  if (!accessToken) {
    throw new Error("Missing LINE_MESSAGING_ACCESS_TOKEN");
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE push failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

export async function replyLineMessage(replyToken: string, messages: LineMessage[]) {
  if (!accessToken) {
    throw new Error("Missing LINE_MESSAGING_ACCESS_TOKEN");
  }
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  // reply token ใช้ได้ครั้งเดียว/หมดอายุเร็ว — อย่าทำให้ caller ล้ม
  if (!res.ok) {
    console.error("LINE reply failed", res.status, await res.text());
  }
}

// "23 Nov 2026" — format อังกฤษตามที่พี่เจ้าของกำหนด
export function formatDateEN(date: string | null | undefined) {
  if (!date) return "To Be Confirmed";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type JobInfo = {
  projectName: string;
  clientName?: string | null;
  shootingDate?: string | null;
  budget?: string | null;
};

function infoRows(job: JobInfo) {
  const rows: [string, string][] = [
    ["Client", job.clientName || "To Be Confirmed"],
    ["Shooting Date", formatDateEN(job.shootingDate)],
    ["Budget", job.budget || "To Be Confirmed"],
  ];
  return rows.map(([label, value]) => ({
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: label, color: "#8c8c8c", size: "sm", flex: 3 },
      { type: "text", text: value, size: "sm", wrap: true, flex: 5, weight: "bold" },
    ],
  }));
}

// ปุ่ม gradient น้ำเงิน→แดง แบบระบบเดิม (Flex button ธรรมดาใส่ gradient
// ไม่ได้ — ใช้ box + linearGradient + action แทน)
function gradientButton(label: string, data: string, displayText: string) {
  return {
    type: "box",
    layout: "vertical",
    cornerRadius: "28px",
    paddingAll: "12px",
    background: {
      type: "linearGradient",
      angle: "90deg",
      startColor: "#1D4ED8",
      endColor: "#B82233",
    },
    action: { type: "postback", data, displayText },
    contents: [
      {
        type: "text",
        text: label,
        color: "#ffffff",
        align: "center",
        weight: "bold",
        size: "md",
      },
    ],
  };
}

function grayButton(label: string, data: string, displayText: string) {
  return {
    type: "box",
    layout: "vertical",
    cornerRadius: "28px",
    paddingAll: "12px",
    backgroundColor: "#e9e9e9",
    action: { type: "postback", data, displayText },
    contents: [
      {
        type: "text",
        text: label,
        color: "#555555",
        align: "center",
        weight: "bold",
        size: "md",
      },
    ],
  };
}

// Flex แจ้งงานใหม่ — ปุ่มเป็น postback ตอบในแชทเลย (เช็คคิว):
// สนใจ (Interested) / ไม่สะดวก
export function buildJobOfferFlex(job: JobInfo & { projectTalentId: string }) {
  return {
    type: "flex",
    altText: `🎬 มีงานใหม่จาก GAMDANG AGENCY: ${job.projectName}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0d1b2a",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "GAMDANG AGENCY",
            color: "#ffffff",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: "มีงานใหม่เสนอให้คุณ 🎬",
            color: "#9fb3c8",
            size: "xs",
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: job.projectName,
            weight: "bold",
            size: "lg",
            wrap: true,
            color: "#1D4ED8",
          },
          ...infoRows(job),
          {
            type: "text",
            text: "กดปุ่มด้านล่างเพื่อเช็คคิว — ทีมงานจะยืนยันอีกครั้งเมื่องาน Confirmed",
            size: "xs",
            color: "#8c8c8c",
            wrap: true,
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          gradientButton(
            "สนใจ (Interested)",
            `action=job&pt=${job.projectTalentId}&response=accepted`,
            "สนใจ (Interested)",
          ),
          grayButton(
            "ไม่สะดวก",
            `action=job&pt=${job.projectTalentId}&response=declined`,
            "ไม่สะดวก",
          ),
        ],
      },
    },
  };
}

// Flex ยืนยันงาน — ส่งเมื่อลูกค้าคอนเฟิร์มแล้ว
export function buildJobConfirmedFlex(job: JobInfo) {
  return {
    type: "flex",
    altText: `🎉 Job Confirmed: ${job.projectName}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        background: {
          type: "linearGradient",
          angle: "135deg",
          startColor: "#1D4ED8",
          endColor: "#B82233",
        },
        contents: [
          {
            type: "text",
            text: "Job Confirmed 🎉",
            color: "#ffffff",
            weight: "bold",
            size: "lg",
          },
          {
            type: "text",
            text: "GAMDANG AGENCY",
            color: "#ffffffb0",
            size: "xs",
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: job.projectName,
            weight: "bold",
            size: "lg",
            wrap: true,
            color: "#1D4ED8",
          },
          ...infoRows(job),
          {
            type: "text",
            text: "งานนี้ได้รับการยืนยันแล้ว 🙌 กรุณาล็อกคิววันถ่ายไว้เลยนะคะ ทีมงานจะติดต่อเรื่องรายละเอียด/นัดหมายอีกครั้งค่ะ",
            size: "xs",
            color: "#8c8c8c",
            wrap: true,
            margin: "md",
          },
        ],
      },
    },
  };
}
