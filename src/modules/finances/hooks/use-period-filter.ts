"use client";

import { useState, useCallback, useMemo } from "react";
import { MONTHS } from "@/lib/utils";

export function usePeriodFilter() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | undefined>(now.getMonth() + 1);

  const isYearMode = month === undefined;

  const label = useMemo(() => {
    if (month) {
      return `${MONTHS[month - 1]} ${year}`;
    }
    return String(year);
  }, [year, month]);

  const goToPrev = useCallback(() => {
    if (month) {
      // Month mode: go to previous month
      setMonth((prev) => {
        if (prev === 1) {
          setYear((y) => y - 1);
          return 12;
        }
        return prev! - 1;
      });
    } else {
      // Year mode: go to previous year
      setYear((y) => y - 1);
    }
  }, [month]);

  const goToNext = useCallback(() => {
    if (month) {
      // Month mode: go to next month
      setMonth((prev) => {
        if (prev === 12) {
          setYear((y) => y + 1);
          return 1;
        }
        return prev! + 1;
      });
    } else {
      // Year mode: go to next year
      setYear((y) => y + 1);
    }
  }, [month]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  const setThisMonth = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  const setLastMonth = useCallback(() => {
    const now = new Date();
    const lastMonth = now.getMonth(); // 0-indexed, so current month - 1
    if (lastMonth === 0) {
      setYear(now.getFullYear() - 1);
      setMonth(12);
    } else {
      setYear(now.getFullYear());
      setMonth(lastMonth);
    }
  }, []);

  const setThisYear = useCallback(() => {
    setYear(new Date().getFullYear());
    setMonth(undefined);
  }, []);

  const setLastYear = useCallback(() => {
    setYear(new Date().getFullYear() - 1);
    setMonth(undefined);
  }, []);

  return {
    year,
    month,
    isYearMode,
    label,
    setYear,
    setMonth,
    goToPrev,
    goToNext,
    goToToday,
    setThisMonth,
    setLastMonth,
    setThisYear,
    setLastYear,
  };
}
