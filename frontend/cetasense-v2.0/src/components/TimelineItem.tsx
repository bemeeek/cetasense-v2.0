// src/components/landing/TimelineItem.tsx
import React from "react";
import { Link } from "react-router-dom";

interface Props {
  icon: React.ReactNode;   // sekarang image src
  title: string;
  description: string;
  linkText: string;
  to: string;
}

const TimelineItem: React.FC<Props> = ({
  icon, title, description, linkText, to
}) => (
  <div className="flex items-start space-x-4 group">
    {/* Icon bulat */}
    <div className="flex-shrink-0 p-3 bg-blue-100 rounded-full shadow-md group-hover:bg-blue-200 transition">
      {icon}
    </div>
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-gray-600 mb-2">{description}</p>
      <Link
        to={to}
        className="inline-block text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
      >
        {linkText} →
      </Link>
    </div>
  </div>
);

export default TimelineItem;
