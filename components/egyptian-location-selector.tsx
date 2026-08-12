"use client";

import React, { useState, useRef, useEffect } from "react";
import { EGYPTIAN_GOVERNORATES } from "@/lib/egyptian-locations";
import { MapPin, ChevronDown, Check } from "lucide-react";

interface EgyptianLocationSelectorProps {
  value: string;
  onChange: (locationStr: string) => void;
  label?: string;
}

export function EgyptianLocationSelector({
  value,
  onChange,
  label = "المحافظة والمدينة *",
}: EgyptianLocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGovId, setSelectedGovId] = useState(EGYPTIAN_GOVERNORATES[0].id);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeGov = EGYPTIAN_GOVERNORATES.find((g) => g.id === selectedGovId) ?? EGYPTIAN_GOVERNORATES[0];

  return (
    <div className="space-y-1.5 relative w-full" ref={dropdownRef}>
      {label && <label className="block text-[13px] font-bold text-[#05291A]">{label}</label>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[48px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 flex items-center justify-between text-[13px] text-[#05291A] font-bold outline-none hover:border-[#056B38] transition-all cursor-pointer shadow-2xs"
      >
        <div className="flex items-center gap-2 truncate">
          <MapPin className="w-4 h-4 text-[#056B38] shrink-0" />
          <span>{value || "اختر المحافظة والمدينة..."}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#526B5E] transition-transform duration-200 ${isOpen ? "rotate-180 text-[#056B38]" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 left-0 z-50 rounded-[18px] border border-[#D1E3D6] bg-white p-3 shadow-xl space-y-3 animate-in fade-in duration-150">
          
          {/* Governorates Tabs */}
          <div>
            <div className="text-[11px] font-bold text-[#526B5E] mb-1.5">اختر المحافظة:</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar scrollbar-thin">
              {EGYPTIAN_GOVERNORATES.map((gov) => {
                const isGovActive = gov.id === selectedGovId;
                return (
                  <button
                    key={gov.id}
                    type="button"
                    onClick={() => setSelectedGovId(gov.id)}
                    className={`px-3 py-1.5 rounded-[10px] text-[12px] font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                      isGovActive
                        ? "bg-[#056B38] text-white"
                        : "bg-[#E8FAF0] text-[#056B38] hover:bg-[#D4F5E0]"
                    }`}
                  >
                    {gov.nameAr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cities List for active Governorate */}
          <div>
            <div className="text-[11px] font-bold text-[#526B5E] mb-1.5">
              مدن ومناطق {activeGov.nameAr}:
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {activeGov.cities.map((city) => {
                const locationFull = `${city}، ${activeGov.nameAr}`;
                const isSelected = value === locationFull;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      onChange(locationFull);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-[10px] text-[12px] font-bold text-right flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? "bg-[#E8FAF0] text-[#056B38]" : "text-[#05291A] hover:bg-neutral-50"
                    }`}
                  >
                    <span>{city}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#056B38]" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
