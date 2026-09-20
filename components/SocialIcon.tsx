// โลโก้จริงของแต่ละแพลตฟอร์ม (rounded-square app-icon style) — ใช้ทุกที่ที่โชว์
// ช่องทาง social แทนวงกลมตัวย่อเดิม · key ตรงกับ SOCIAL_PLATFORMS ใน lib/social
export function SocialIcon({
  platform,
  size = 18,
  title,
  className = "",
}: {
  platform: string;
  size?: number;
  title?: string;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    className,
    role: "img" as const,
    "aria-label": title ?? platform,
  };
  const t = title ? <title>{title}</title> : null;

  switch (platform) {
    case "ig":
      return (
        <svg {...common}>
          {t}
          <defs>
            <linearGradient id="soc-ig" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#FEDA75" />
              <stop offset=".35" stopColor="#FA7E1E" />
              <stop offset=".6" stopColor="#D62976" />
              <stop offset="1" stopColor="#4F5BD5" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="6" fill="url(#soc-ig)" />
          <rect
            x="6"
            y="6"
            width="12"
            height="12"
            rx="3.6"
            fill="none"
            stroke="#fff"
            strokeWidth="1.6"
          />
          <circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.6" />
          <circle cx="15.9" cy="8.1" r="1.05" fill="#fff" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          {t}
          <rect width="24" height="24" rx="6" fill="#010101" />
          <path
            fill="#fff"
            d="M16.7 6.9a3.6 3.6 0 0 1-1.63-2.4h-2.4v9.86a2.03 2.03 0 1 1-1.44-1.95V9.9a4.46 4.46 0 1 0 3.84 4.42V9.53a5.9 5.9 0 0 0 3.14.9V8.02a3.55 3.55 0 0 1-1.51-1.12z"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          {t}
          <rect x="1" y="5" width="22" height="14" rx="4" fill="#FF0000" />
          <path fill="#fff" d="M10 8.8v6.4l5.4-3.2z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          {t}
          <rect width="24" height="24" rx="6" fill="#1877F2" />
          <path
            fill="#fff"
            d="M13.4 21v-7.9h2.63l.4-3.05h-3.03V8.1c0-.88.24-1.48 1.5-1.48h1.6V3.9c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.42-3.9 4.02v2.25H7.6v3.05h2.66V21z"
          />
        </svg>
      );
    case "line":
      // โลโก้ LINE — สี่เหลี่ยมมนเขียว + ฟองข้อความขาวมีคำว่า LINE
      // ใช้ตอนลิงก์ไป OA ของเราเอง (ปุ่ม "ทักไลน์" หน้าจองถ่าย)
      return (
        <svg {...common}>
          {t}
          <rect width="24" height="24" rx="6" fill="#06C755" />
          {/* ฟองข้อความ: วงรีมีหางชี้ลงซ้าย แบบโลโก้จริง */}
          <path
            fill="#fff"
            d="M12 4.6c-4.3 0-7.8 2.8-7.8 6.3 0 3.1 2.8 5.7 6.5 6.2.26.05.6.17.69.38.08.2.05.5.02.7l-.11.66c-.03.2-.16.78.69.42.85-.35 4.55-2.68 6.2-4.59 1.14-1.25 1.6-2.5 1.6-3.77 0-3.5-3.5-6.3-7.79-6.3z"
          />
          {/* ตัวอักษร LINE ในฟอง */}
          <text
            x="12"
            y="13.2"
            textAnchor="middle"
            textLength="9.4"
            lengthAdjust="spacingAndGlyphs"
            fontSize="4.6"
            fontWeight="800"
            fontFamily="Helvetica, Arial, sans-serif"
            fill="#06C755"
          >
            LINE
          </text>
        </svg>
      );
    case "line-mark":
      // แบบสีเดียว (currentColor) — ใช้บนพื้นเขียวที่ต้องการโลโก้สีขาว
      return (
        <svg {...common}>
          {t}
          <path
            fill="currentColor"
            d="M12 3c-5 0-9 3.2-9 7.2 0 3.6 3.2 6.6 7.5 7.15.3.06.7.2.8.45.09.23.06.58.03.81l-.13.77c-.04.23-.18.9.8.49.98-.4 5.28-3.1 7.2-5.32C20.5 12.1 21 10.7 21 10.2 21 6.2 17 3 12 3z"
          />
        </svg>
      );
    case "lemon8":
      return (
        <svg {...common}>
          {t}
          <rect width="24" height="24" rx="6" fill="#FFE600" />
          <text
            x="12"
            y="14.6"
            textAnchor="middle"
            textLength="19"
            lengthAdjust="spacingAndGlyphs"
            fontSize="6.4"
            fontStyle="italic"
            fontWeight="900"
            fontFamily="'Arial Rounded MT Bold', Arial, sans-serif"
            fill="#111"
          >
            Lemon8
          </text>
        </svg>
      );
    default:
      return null;
  }
}
