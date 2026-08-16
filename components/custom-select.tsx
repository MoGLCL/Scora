"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (CustomSelectOption | string)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
  dir?: "rtl" | "ltr";
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "اختر...",
  disabled = false,
  className = "",
  triggerClassName = "",
  dropdownClassName = "",
  name,
  size = "md",
  dir = "rtl",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options into CustomSelectOption format
  const normalizedOptions: CustomSelectOption[] = (options || []).map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
          const nextIndex = (currentIndex + 1) % normalizedOptions.length;
          onChange(normalizedOptions[nextIndex].value);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = normalizedOptions.findIndex((opt) => opt.value === value);
          const prevIndex = (currentIndex - 1 + normalizedOptions.length) % normalizedOptions.length;
          onChange(normalizedOptions[prevIndex].value);
        }
      }
    },
    [disabled, isOpen, normalizedOptions, value, onChange]
  );

  // Size styling classes
  const sizeClasses = {
    sm: "h-9 text-xs px-3 rounded-xl",
    md: "h-11 text-xs px-3.5 rounded-2xl",
    lg: "h-12 text-sm px-4 rounded-2xl",
  }[size];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full font-body ${className}`}
      dir={dir}
    >
      {/* Hidden input for form submits */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 border transition-all duration-200 cursor-pointer select-none text-right ${sizeClasses} ${
          isOpen
            ? "border-[#056B38] bg-white ring-3 ring-[#056B38]/15 shadow-sm"
            : "border-[#D1E3D6] bg-[#F7FAF8] hover:bg-white hover:border-[#056B38]/60 shadow-2xs"
        } ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-[#F2F7F4] border-[#D1E3D6]"
            : "text-[#05291A]"
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {selectedOption?.icon && (
            <span className="shrink-0 text-[#056B38]">{selectedOption.icon}</span>
          )}
          <span className={`truncate font-bold ${!selectedOption ? "text-[#526B5E]" : ""}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#056B38] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#056B38]" : "text-[#526B5E]"
          }`}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-50 mt-1.5 w-full min-w-[200px] rounded-2xl border border-[#D1E3D6] bg-white p-1.5 shadow-xl transition-all animate-in fade-in-0 zoom-in-95 duration-150 max-h-64 overflow-y-auto ${dropdownClassName}`}
          style={{ transformOrigin: "top" }}
        >
          {normalizedOptions.length === 0 ? (
            <div className="py-3 px-4 text-center text-xs text-[#526B5E] font-medium">
              لا توجد خيارات متاحة
            </div>
          ) : (
            normalizedOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? "bg-[#E8FAF0] text-[#056B38] font-black"
                      : "text-[#05291A] hover:bg-[#F7FAF8] hover:text-[#056B38]"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    {option.icon && (
                      <span className={`shrink-0 ${isSelected ? "text-[#056B38]" : "text-[#526B5E]"}`}>
                        {option.icon}
                      </span>
                    )}
                    <div className="flex flex-col text-right truncate">
                      <span className="truncate">{option.label}</span>
                      {option.description && (
                        <span className="text-[10px] font-normal text-[#526B5E] mt-0.5 truncate">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[#056B38] shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
