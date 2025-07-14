// src/components/landing/TimelineItem.tsx
import React from 'react';
import { Link } from 'react-router-dom';

interface TimelineItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkText: string;
  to: string;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  icon, title, description, linkText, to
}) => (
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0 bg-white p-3 rounded-full shadow">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-gray-600 mb-2">{description}</p>
      <Link to={to} className="text-sm font-medium text-blue-600 hover:underline">
        {linkText}
      </Link>
    </div>
  </div>
);

export default TimelineItem;
