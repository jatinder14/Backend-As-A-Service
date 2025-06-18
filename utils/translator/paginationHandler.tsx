export const restructorArray = (array: any, length: any) => {
  let size = 0,
    subArray: any = [];
  const parentArray = [];
  array?.forEach((each: any, index: any) => {
    subArray.push(each);
    size++;
    if (size === length) {
      parentArray.push(subArray);
      size = 0;
      subArray = [];
    }
  });
  subArray.length && parentArray.push(subArray);
  return parentArray;
};
