import { Period } from "~/types";

  const seconds = {
    min: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
  } as const;

export const periodToSeconds = (period: Period) => {
  const [_, num, unit] = period.match(/(\d+)(\w+)/) ?? [];
  if (!num || !unit) throw new Error("failed to parse period");
  return +num * seconds[unit as keyof typeof seconds];
};
