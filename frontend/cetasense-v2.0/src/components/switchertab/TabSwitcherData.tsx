import React from 'react';
import { NavLink } from 'react-router-dom';

const tabs = [
  { name: 'Plot Data', path: '/settings/algoritma' },
  { name: 'Sistem Pemosisian', path: '/settings/ruangan' },
];

export const TabSwitcherData: React.FC = () => {
  return (
    <nav className="px-8 mt-4">
      <div className="flex space-x-3 p-1 overflow-x-auto bg-[#F9F9F9] rounded-lg w-fit drop-shadow-sm ">
        {tabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            className={({ isActive }) =>
              `w-[200px] py-2 text-sm font-medium text-center transition-all duration-200 rounded-lg ${
                isActive
                  ? 'bg-white  text-black shadow-md'
                  : 'bg-[#F9F9F9] text-gray-400 hover:text-black hover:bg-gray-200'
              }`
            }
          >
            {tab.name}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};


export default TabSwitcherData;
