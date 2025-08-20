"use client";
import { useState, useRef, useEffect } from "react";
import styles from "./DatePicker.module.css";

export default function DatePicker({ value, onChange, placeholder = "Select date", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const datePickerRef = useRef(null);

  // Parse the value to get selected date
  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Set current date to selected date when value changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [value]);

  const formatDisplayValue = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const formatInputValue = (date) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  const handleDateSelect = (day) => {
    const selectedYear = currentDate.getFullYear();
    const selectedMonth = currentDate.getMonth();
    const newDate = new Date(selectedYear, selectedMonth, day);
    onChange(formatInputValue(newDate));
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToPreviousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
  };

  const goToNextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay}></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = 
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentDate.getMonth() &&
        selectedDate.getFullYear() === currentDate.getFullYear();

      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === currentDate.getMonth() &&
        new Date().getFullYear() === currentDate.getFullYear();

      days.push(
        <button
          key={day}
          className={`${styles.dayButton} ${isSelected ? styles.selected : ""} ${
            isToday ? styles.today : ""
          }`}
          onClick={() => handleDateSelect(day)}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className={styles.datePickerContainer} ref={datePickerRef}>
      <div
        className={`${styles.dateInput} ${disabled ? styles.disabled : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={styles.dateValue}>
          {selectedDate ? formatDisplayValue(selectedDate) : placeholder}
        </span>
        <span className={styles.calendarIcon}>📅</span>
      </div>

      {isOpen && !disabled && (
        <div className={styles.calendarDropdown}>
          <div className={styles.calendarHeader}>
            <button
              type="button"
              className={styles.navButton}
              onClick={goToPreviousYear}
            >
              ⟪
            </button>
            <button
              type="button"
              className={styles.navButton}
              onClick={goToPreviousMonth}
            >
              ⟨
            </button>
            <div className={styles.monthYear}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button
              type="button"
              className={styles.navButton}
              onClick={goToNextMonth}
            >
              ⟩
            </button>
            <button
              type="button"
              className={styles.navButton}
              onClick={goToNextYear}
            >
              ⟫
            </button>
          </div>

          <div className={styles.calendarGrid}>
            <div className={styles.daysOfWeek}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className={styles.dayOfWeek}>
                  {day}
                </div>
              ))}
            </div>
            <div className={styles.daysGrid}>
              {renderCalendarDays()}
            </div>
          </div>

          <div className={styles.calendarActions}>
            <button
              type="button"
              className={styles.todayButton}
              onClick={() => {
                const today = new Date();
                onChange(formatInputValue(today));
                setIsOpen(false);
              }}
            >
              Today
            </button>
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
