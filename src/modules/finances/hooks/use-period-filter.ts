"use client";

import { useState, useCallback } from "react";

export function usePeriodFilter() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const goToPrevMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const goToCurrentMonth = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  return {
    year,
    month,
    setYear,
    setMonth,
    goToPrevMonth,
    goToNextMonth,
    goToCurrentMonth,
  };
}
