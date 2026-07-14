import "server-only";

// LINE OA @gamdangmodeling — Messaging API push. คนละ channel กับ LIFF/Login
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

// Flex bubble แจ้งงานใหม่ → ปุ่มเปิด /job/[token] เพื่อตอบรับ/ปฏิเสธ
export function buildJobOfferFlex(opts: {
  projectName: string;
  clientName?: string | null;
  shootingDate?: string | null;
  budget?: string | null;
  jobUrl: string;
}) {
  const rows = [
    opts.clientName && ["ลูกค้า", opts.clientName],
    opts.shootingDate && [
      "วันถ่าย",
      new Date(opts.shootingDate).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    ],
    opts.budget && ["Budget", opts.budget],
  ].filter(Boolean) as [string, string][];

  return {
    type: "flex",
    altText: `🎬 มีงานใหม่จาก GAMDANG AGENCY: ${opts.projectName}`,
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
            text: opts.projectName,
            weight: "bold",
            size: "lg",
            wrap: true,
            color: "#1D4ED8",
          },
          ...rows.map(([label, value]) => ({
            type: "box",
            layout: "baseline",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: label,
                color: "#8c8c8c",
                size: "sm",
                flex: 2,
              },
              {
                type: "text",
                text: value,
                size: "sm",
                wrap: true,
                flex: 5,
                weight: "bold",
              },
            ],
          })),
          {
            type: "text",
            text: "กดปุ่มด้านล่างเพื่อดูรายละเอียดและตอบรับงานภายใน 14 วัน",
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
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#1D4ED8",
            action: {
              type: "uri",
              label: "ดูรายละเอียด & ตอบรับงาน",
              uri: opts.jobUrl,
            },
          },
        ],
      },
    },
  };
}
