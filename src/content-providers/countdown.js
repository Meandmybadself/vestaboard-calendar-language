import { DateTime } from 'luxon';

const parseCountdownArgs = (rawTitle, keyword, dateTokenCount, timezone) => {
  const rest = rawTitle.slice(keyword.length).trim();
  const tokens = rest.split(/\s+/);

  if (tokens.length < dateTokenCount + 1) {
    throw new Error(`${keyword}: expected date${dateTokenCount === 2 ? ' and time' : ''} followed by title, got: "${rest}"`);
  }

  const dateStr = tokens[0];
  const timeStr = dateTokenCount === 2 ? tokens[1] : null;
  const displayTitle = tokens.slice(dateTokenCount).join(' ');

  if (!displayTitle) {
    throw new Error(`${keyword}: missing title text`);
  }

  const targetDate = timeStr
    ? DateTime.fromFormat(`${dateStr} ${timeStr}`, 'MM/dd/yy HH:mm:ss', { zone: timezone })
    : DateTime.fromFormat(dateStr, 'MM/dd/yy', { zone: timezone }).startOf('day');

  if (!targetDate.isValid) {
    throw new Error(`${keyword}: invalid date/time — ${targetDate.invalidExplanation}`);
  }

  return { targetDate, displayTitle };
};

const formatTimeLine = (diff) => {
  const { days, hours, minutes, seconds } = diff
    .shiftTo('days', 'hours', 'minutes', 'seconds')
    .toObject();

  const parts = [
    { value: Math.floor(days),    label: 'd' },
    { value: Math.floor(hours),   label: 'h' },
    { value: Math.floor(minutes), label: 'm' },
    { value: Math.floor(seconds), label: 's' },
  ];

  const firstNonZero = parts.findIndex(({ value }) => value >= 1);
  const displayParts = firstNonZero === -1
    ? [{ value: 0, label: 's' }]
    : parts.slice(firstNonZero);

  return displayParts.map(({ value, label }) => `${value}${label}`).join(' ');
};

export const getCountdownDaysContent = async (rawTitle, config) => {
  const keyword = 'COUNTDOWN_DAYS';
  const timezone = config.TIMEZONE;
  console.log(`countdown: processing ${keyword}`);
  try {
    const { targetDate, displayTitle } = parseCountdownArgs(rawTitle, keyword, 1, timezone);
    const now = DateTime.now().setZone(timezone);
    const daysRemaining = Math.floor(
      targetDate.startOf('day').diff(now.startOf('day'), 'days').days
    );

    if (daysRemaining <= 0) {
      console.log(`countdown: ${keyword} target has passed or is today, skipping board update`);
      return { action: 'countdown_expired', skipBoardUpdate: true };
    }

    console.log(`countdown: ${daysRemaining} days until "${displayTitle}"`);
    const oneOrMore = daysRemaining >= 1 ? 'S' : '';
    return `${daysRemaining} DAY${oneOrMore} UNTIL "${displayTitle}"`;
  } catch (error) {
    console.error(`countdown: ${keyword} error —`, error.message);
    return 'Countdown unavailable';
  }
};

export const getCountdownTimeContent = async (rawTitle, config) => {
  const keyword = 'COUNTDOWN_TIME';
  const timezone = config.TIMEZONE;
  console.log(`countdown: processing ${keyword}`);
  try {
    const { targetDate, displayTitle } = parseCountdownArgs(rawTitle, keyword, 2, timezone);
    const now = DateTime.now().setZone(timezone);
    const diff = targetDate.diff(now);

    if (diff.as('milliseconds') <= 0) {
      console.log(`countdown: ${keyword} target has passed, skipping board update`);
      return { action: 'countdown_expired', skipBoardUpdate: true };
    }

    const timeLine = formatTimeLine(diff);
    console.log(`countdown: ${timeLine} until "${displayTitle}"`);
    return `${timeLine}\n${displayTitle}`;
  } catch (error) {
    console.error(`countdown: ${keyword} error —`, error.message);
    return 'Countdown unavailable';
  }
};
