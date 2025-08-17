export const getTextHandler = (state: any, index: any) => {
  if (state?.length > 0) {
    return state[index] ? state[index] : '';
  } else {
    return '';
  }
};
