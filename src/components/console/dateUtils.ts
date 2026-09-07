// Helper for inclusive calendar month difference (+1 month)
export function getInclusiveMonths(startDateStr: string, endDateStr?: string | null): number {
  const [sYear, sMonth] = startDateStr.split('-').map(Number);
  let eYear: number;
  let eMonth: number;
  if (endDateStr) {
    const parts = endDateStr.split('-').map(Number);
    eYear = parts[0];
    eMonth = parts[1];
  } else {
    const now = new Date();
    eYear = now.getFullYear();
    eMonth = now.getMonth() + 1;
  }
  const months = (eYear - sYear) * 12 + (eMonth - sMonth) + 1;
  return Math.max(1, months);
}

// Helper for age calculation from date of birth (YYYY-MM-DD)
export function getAge(dobStr: string): number {
  const [birthYear, birthMonth, birthDay] = dobStr.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const monthDiff = today.getMonth() + 1 - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
    age -= 1;
  }
  return age;
}
