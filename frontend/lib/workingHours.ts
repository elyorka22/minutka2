export function isOpenNowByWorkingHours(workingHours?: string | null, now = new Date()): boolean {
  const raw = String(workingHours ?? "").trim();
  if (!raw) return true;
  const m = /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/.exec(raw);
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
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return true;
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end;
}

