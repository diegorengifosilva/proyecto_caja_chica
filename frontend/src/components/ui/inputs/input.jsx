// src/components/ui/input.jsx
import React from "react";

const Input = ({ label, name, value, onChange, type = "text", readOnly = false }) => {
  return (
    <div className="flex flex-col">
      {label && <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={`border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          readOnly ? "bg-gray-100 text-gray-500" : ""
        }`}
      />
    </div>
  );
};

export { Input };