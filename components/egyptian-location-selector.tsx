"use client";

import { useState, useEffect } from "react";
import { EGYPTIAN_GOVERNORATES, EGYPT_GOVERNORATES_AND_CITIES } from "@/lib/egyptian-locations";
import { CustomSelect } from "@/components/custom-select";
import { MapPin, Building2 } from "lucide-react";

interface EgyptianLocationSelectorProps {
  value: string;
  onChange: (locationStr: string) => void;
  label?: string;
}

export function EgyptianLocationSelector({
  value,
  onChange,
  label = "المحافظة والمدينة المصرية *",
}: EgyptianLocationSelectorProps) {
  // Parse incoming value (e.g. "القاهرة - مدينة نصر" or "مدينة نصر، القاهرة" or "القاهرة")
  const parseLocation = (val: string) => {
    if (!val) return { gov: "", city: "" };
    if (val.includes(" - ")) {
      const [g, c] = val.split(" - ");
      return { gov: g.trim(), city: c ? c.trim() : "" };
    }
    if (val.includes("،")) {
      const [c, g] = val.split("،");
      return { gov: g ? g.trim() : "", city: c ? c.trim() : "" };
    }
    if (EGYPT_GOVERNORATES_AND_CITIES[val]) {
      return { gov: val, city: "" };
    }
    return { gov: "", city: "" };
  };

  const initial = parseLocation(value);
  const [selectedGov, setSelectedGov] = useState(initial.gov);
  const [selectedCity, setSelectedCity] = useState(initial.city);

  useEffect(() => {
    const parsed = parseLocation(value);
    setSelectedGov(parsed.gov);
    setSelectedCity(parsed.city);
  }, [value]);

  const handleGovChange = (newGov: string) => {
    setSelectedGov(newGov);
    const availableCities = EGYPT_GOVERNORATES_AND_CITIES[newGov] || [];
    const newCity = availableCities[0] || "";
    setSelectedCity(newCity);
    onChange(newCity ? `${newGov} - ${newCity}` : newGov);
  };

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    onChange(selectedGov ? `${selectedGov} - ${newCity}` : newCity);
  };

  const governorateOptions = EGYPTIAN_GOVERNORATES.map((g) => ({
    value: g.nameAr,
    label: g.nameAr,
  }));

  const availableCities = selectedGov ? EGYPT_GOVERNORATES_AND_CITIES[selectedGov] || [] : [];
  const cityOptions = availableCities.map((c) => ({
    value: c,
    label: c,
  }));

  return (
    <div className="space-y-2 w-full font-body">
      {label && <label className="block text-xs font-black text-[#05291A]">{label}</label>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Field 1: Governorate */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[#526B5E] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#056B38]" />
            <span>المحافظة:</span>
          </span>
          <CustomSelect
            value={selectedGov}
            onChange={handleGovChange}
            options={governorateOptions}
            placeholder="اختر المحافظة..."
            size="lg"
          />
        </div>

        {/* Field 2: City / District */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-[#526B5E] flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-[#056B38]" />
            <span>المدينة أو المنطقة:</span>
          </span>
          <CustomSelect
            value={selectedCity}
            onChange={handleCityChange}
            options={cityOptions}
            placeholder={selectedGov ? "اختر المدينة..." : "اختر المحافظة أولاً"}
            disabled={!selectedGov || cityOptions.length === 0}
            size="lg"
          />
        </div>
      </div>
    </div>
  );
}
