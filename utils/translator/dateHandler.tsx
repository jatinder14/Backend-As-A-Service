//  date to define
export const month = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const getDateHandler = (date: any) => {
  const dateTime = new Date(date);
  const day =
    dateTime.getDate() +
    " " +
    month[dateTime.getMonth()] +
    " " +
    dateTime.getFullYear();
  return day;
};

export const getDateOption2 = (date: any) => {
  const dateTime = new Date(date);
  const day =
    dateTime.getFullYear() +
    "-" +
    (dateTime.getMonth() + 1) +
    "-" +
    dateTime.getDate();
  return day;
};

export const getTimeHandler = (date: any) => {
  const dateTime = new Date(date);
  let hours: any = dateTime.getHours();
  let minutes: any = dateTime.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";

  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // Hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes; // Add leading zero to minutes if needed

  const time = hours + ":" + minutes + " " + period;
  return time;
};

export const getYearHandler = (dateStr: any) => {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  // Check if the string is a valid date
  if (!isNaN(date?.getTime())) {
    return date?.getFullYear();
  }

  // If it's not a valid date, return the original string
  return dateStr;
};
