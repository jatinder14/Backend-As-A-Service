const getRandomString = (length = 10) => {
  return Math.random().toFixed(length).replace('0.', '').toString();
};

export function pad(str, count = 2, char = '0') {
  str = str.toString();
  if (str.length < count)
    str =
      Array(count - str.length)
        .fill(char)
        .join('') + str;
  return str;
}

export function parseDuration(duration) {
  if (!duration) {
    return '';
  }

  // Regular expressions to match patterns like P1D, PT1H, PT1M (case-insensitive)
  const dayRegex = /p(\d+)d/i;
  const hourRegex = /pt(\d+)h/i;
  const minuteRegex = /pt(\d+)m/i;

  const dayMatch = duration.match(dayRegex);
  const hourMatch = duration.match(hourRegex);
  const minuteMatch = duration.match(minuteRegex);

  let days = 0;
  let hours = 0;
  let minutes = 0;

  if (dayMatch) {
    days = parseInt(dayMatch[1], 10);
  }
  if (hourMatch) {
    hours = parseInt(hourMatch[1], 10);
  }
  if (minuteMatch) {
    minutes = parseInt(minuteMatch[1], 10);
  }

  let result = '';
  if (days > 0) {
    result += `${days} day${days > 1 ? 's' : ''} `;
  }
  if (hours > 0) {
    result += `${hours} hour${hours > 1 ? 's' : ''} `;
  }
  if (minutes > 0) {
    result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return result.trim();
}

export { getRandomString };
