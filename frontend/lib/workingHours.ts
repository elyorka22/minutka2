export function isOpenNowByWorkingHours(workingHours?: string | null, now = new Date()): boolean {
  const raw = String(workingHours ?? "").trim();
  if (!raw) return true;
  const normalized = raw.replace(/[—–]/g, "-").replace(/\./g, ":");
  // Qo'llab-quvvatlash: 9:00-23:00, 09.00 - 23.00, 09:00-23:00
  const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(normalized);
  if (!m) return true;
  const sh = Number(m[1]);
  const sm = Number(m[2]);
  const eh = Number(m[3]);
  const em = Number(m[4]);
  if (
    !Number.isInteger(sh) ||
    !Number.isInteger(sm) ||
    !Number.isInteger(eh) ||
    !Number.isInteger(em) ||
    sh < 0 ||
    sh > 23 ||
    eh < 0 ||
    eh > 23 ||
    sm < 0 ||
    sm > 59 ||
    em < 0 ||
    em > 59
  ) {
    return true;
  }
  const nowParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const [curH, curM] = nowParts.split(":").map((x) => Number(x));
  if (!Number.isFinite(curH) || !Number.isFinite(curM)) return true;
  const cur = curH * 60 + curM;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return true;
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end;
}

