// src/components/Sidebar.tsx
import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'

import HomeIcon from '../../assets/sidebar-home.svg'
import DataIcon from '../../assets/sidebar-data.svg'
import SettingsIcon from '../../assets/sidebar-setting.svg'
import UnionIcon from '../../assets/ai-settings-spark--cog-gear-settings-machine-artificial-intelligence.svg'

const menu = [
  { icon: HomeIcon, label: 'Home', to: '/home' },
  { icon: DataIcon, label: 'Data Stream', to: '/data-stream' },
  { icon: SettingsIcon, label: 'Settings Page', to: '/settings' },
]

const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`
        bg-white h-screen flex flex-col shadow-lg rounded-lg
        transition-all duration-300 overflow-hidden
        ${expanded
          ? 'w-64 px-6 py-8 items-start'
          : 'w-16 px-0 py-8 items-center'}
      `}
    >
      {/* Logo */}
      {expanded ? (
        <div className="mb-12 flex items-center w-full bg-amber-800">
          <img src={UnionIcon} alt="Logo" className="w-12 h-12 rounded-full" />
          <div className="ml-3">
            <h3 className="text-2xl font-bold">Cetasense</h3>
            <p className="text-xs text-gray-500">v2.0</p>
          </div>
        </div>
      ) : (
        <div className="mb-12 w-full flex justify-center bg-pink-500">
          <img src={UnionIcon} alt="Logo" className="w-8 h-8 rounded-full" />
        </div>
      )}

      {/* Menu */}
      <nav className="flex flex-col flex-1 w-full space-y-4">
        {menu.map(({ icon, label, to }) => {
          const align = expanded
            ? 'justify-start pl-6'   // expanded: icon+label dari kiri
            : 'justify-center pl-10'       // collapsed: benar–benar center

          return (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `flex items-center w-full py-2 transition-colors duration-200 
                ${isActive ? 'text-black font-semibold' : 'text-gray-600 hover:text-black'} 
                ${align}`
              }
            >
              <img src={icon} alt={label} className="w-6 h-6" />
              <span
                className={`
                  ml-3 whitespace-nowrap transition-opacity duration-300
                  ${expanded ? 'opacity-100' : 'opacity-0'}
                `}
              >
                {label}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

export default Sidebar
