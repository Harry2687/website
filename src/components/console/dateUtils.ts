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
  return months;
}

// Helper for age calculation from date of birth (YYYY-MM-DD) as of a target date (defaults to today)
export function getAge(dobStr: string, asOfStr?: string | null): number {
  const [birthYear, birthMonth, birthDay] = dobStr.split('-').map(Number);
  let targetYear: number;
  let targetMonth: number;
  let targetDay: number;
  if (asOfStr) {
    const parts = asOfStr.split('-').map(Number);
    targetYear = parts[0];
    targetMonth = parts[1];
    targetDay = parts[2];
  } else {
    const today = new Date();
    targetYear = today.getFullYear();
    targetMonth = today.getMonth() + 1;
    targetDay = today.getDate();
  }
  let age = targetYear - birthYear;
  const monthDiff = targetMonth - birthMonth;
  if (monthDiff < 0 || (monthDiff === 0 && targetDay < birthDay)) {
    age -= 1;
  }
  return age;
}
