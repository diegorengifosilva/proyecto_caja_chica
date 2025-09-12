// src/components/ui/Textarea.jsx
import React from "react";

export function Textarea({ label, name, value, onChange, placeholder, className = "" }) {
  return (
    <div className="flex flex-col mb-2">
      {label && <label className="mb-1 font-medium text-gray-700">{label}:</label>}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
    </div>
  );
}
