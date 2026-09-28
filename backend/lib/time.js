const weekdayMap = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

function weekdayInTz(date, tz) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short'
  });
  const dayStr = formatter.format(d);
  return weekdayMap[dayStr];
}

function dateInTz(date, tz) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

module.exports = {
  weekdayInTz,
  dateInTz
};
