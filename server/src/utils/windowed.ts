import {Repeat} from "~/types";

export const windowed = function <T, N extends number>(array: T[], size: N) {
  return array.reduce(
    (acc, _, i, arr) => {
      return i + size > arr.length
        ? acc
        : [...acc, arr.slice(i, i + size) as Repeat<T, N>];
    },
    [] as Repeat<T, N>[]
  );
};
