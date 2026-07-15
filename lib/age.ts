// Age is never stored in the DB — always computed from dob, here and
// wherever it needs to be displayed or filtered on.
export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

// อายุแบบการ์ดเอเจนซี่เด็ก: ต่ำกว่า 10 ปีโชว์เดือนด้วย เช่น "3 ปี 0 ด."
// (แบบระบบเก่า "3ป 0ด") — 10 ปีขึ้นไปโชว์แค่ปี
export function ageLabel(dob: string): string {
  const birth = new Date(dob);
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "-";
  return years < 10 ? `${years} ปี ${months} ด.` : `${years} ปี`;
}

export function yearsAgo(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
}
