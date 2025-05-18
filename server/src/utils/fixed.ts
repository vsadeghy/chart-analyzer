export const fixed = (n: string | number, digits = 2) => {
  return +(Math.round(+n * 10 ** digits) / 10 ** digits).toFixed(digits);
};
