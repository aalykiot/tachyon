import { CronosExpression } from "./deps.ts";

export const nextDate = (interval: string | number): Date => {
  // if cron expression use cronosjs
  if (typeof interval === "string") {
    return CronosExpression.parse(interval).nextDate();
  }
  // otherwise it's an interval
  return new Date(new Date().getTime() + interval);
};
