export function propertyStatusHandler(status: any) {
  if (status === "OFF_PLAN") {
    return "Sold";
  }
  if (status === "SALE") {
    return "Sold";
  }
  if (status === "RENT") {
    return "Rented";
  }
}
