"use client";

import { useState } from "react";
import { MONTHS } from "@/lib/utils";

export function usePeriodFilter() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | undefined>(now.getMonth() + 1);

  const isYearMode = month === undefined;

  const label = month ? `${MONTHS[month - 1]} ${year}` : String(year);

  function goToPrev() {
    if (month) {
      if (month === 1) {
        setYear((y) => y - 1);
        setMonth(12);
      } else {
        setMonth(month - 1);
      }
    } else {
      setYear((y) => y - 1);
    }
  }

  function goToNext() {
    if (month) {
      if (month === 12) {
        setYear((y) => y + 1);
        setMonth(1);
      } else {
        setMonth(month + 1);
      }
    } else {
      setYear((y) => y + 1);
    }
  }

  function goToToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }

  function setThisMonth() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }

  function setLastMonth() {
    const now = new Date();
    const lastMonth = now.getMonth(); // 0-indexed, so current month - 1
    if (lastMonth === 0) {
      setYear(now.getFullYear() - 1);
      setMonth(12);
    } else {
      setYear(now.getFullYear());
      setMonth(lastMonth);
    }
  }

  function setThisYear() {
    setYear(new Date().getFullYear());
    setMonth(undefined);
  }

  function setLastYear() {
    setYear(new Date().getFullYear() - 1);
    setMonth(undefined);
  }

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
