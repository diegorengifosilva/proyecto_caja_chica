// src/components/ui/CustomSelect.jsx
import React from "react";

const CustomSelect = ({ label, icon, name, options, value, onChange }) => {
  return (
    <div className="flex flex-col">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
        {icon && <span className="text-xl">{icon}</span>}
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="border rounded p-2 w-full"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CustomSelect;