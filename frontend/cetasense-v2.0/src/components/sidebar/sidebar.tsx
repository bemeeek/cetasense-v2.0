// src/components/Sidebar.tsx
import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import HomeIcon from '../../assets/sidebar-home.svg'
import DataIcon from '../../assets/sidebar-data.svg'
import SettingsIcon from '../../assets/sidebar-setting.svg'
import CetaSenseIcon from '../../assets/Frame-16.svg'
// import UnionIcon from '../../assets/ai-settings-spark--cog-gear-settings-machine-artificial-intelligence.svg'

const menu = [
  { icon: HomeIcon, label: 'Home', to: '/home' },
  { icon: SettingsIcon, label: 'Pengaturan', to: '/settings/algoritma', isSettings: true},
  { icon: DataIcon, label: 'Laman Data', to: '/data-stream/lokalisasi', isDataStream: true },
]

const Sidebar: React.FC = () => {
  const [expanded, setExpanded] = useState(false)
  const location = useLocation()

  const isSettingsActive = () => location.pathname.startsWith('/settings')
  const isDataStreamActive = () => location.pathname.startsWith('/data-stream')

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`
        bg-white h-full flex flex-col shadow-lg
        transition-all duration-300 ease-in-out overflow-hidden
        ${expanded ? 'w-64' : 'w-16'}
      `}
    >
      {/* Logo Section - Perfect Alignment */}
      <div className="h-20 flex items-center justify-center relative border-b border-gray-50">
        {expanded ? (
          <div className="flex items-center w-full px-4">
            <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
              <img 
                src={CetaSenseIcon} 
                alt="Logo" 
                className="w-8 h-8 rounded-full" 
              />
            </div>
            <div className="ml-3 flex flex-col justify-center">
              <h3 className="text-xl font-bold text-gray-800 leading-tight">
                Cetasense
              </h3>
              <p className="text-xs text-gray-500 leading-tight">v2.0</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <img 
              src={CetaSenseIcon} 
              alt="Logo" 
              className="w-8 h-8 rounded-full" 
            />
          </div>
        )}
      </div>

      {/* Menu Section - Perfect Icon Alignment */}
      <nav className="flex-1 py-4">
        <div className="space-y-3 px-2">
            {menu.map(({ icon, label, to, isSettings, isDataStream }) => {
            const isActive = isSettings
              ? isSettingsActive()
              : isDataStream
              ? isDataStreamActive()
              : location.pathname === to
              

            return (
              <NavLink
                key={label}
                to={to}
                className={`
                  group flex items-center h-12 rounded-lg transition-all duration-200
                  ${isActive
                    ? 'bg-blue-50 text-blue-600 font-medium shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                  ${expanded ? 'px-3' : 'px-0'}
                `}
              >
                {/* Icon Container - Fixed Width for Perfect Alignment */}
                <div className={`flex items-center justify-center flex-shrink-0 ${expanded ? 'w-6 h-6' : 'w-full h-full'}`}>
                  <img 
                    src={icon} 
                    alt={label} 
                    className="w-5 h-5 transition-all duration-200" 
                  />
                </div>
                
                {/* Label with Smooth Transition */}
                <span
                  className={`
                    font-medium whitespace-nowrap transition-all duration-300
                    ${expanded 
                      ? 'ml-3 opacity-100 translate-x-0' 
                      : 'ml-0 opacity-0 translate-x-4 w-0 overflow-hidden'}
                  `}
                >
                  {label}
                </span>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute h-8 bg-blue-500 rounded-l-full"></div>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 py-3">
        {expanded ? (
          <div className="px-4 text-xs text-gray-400 text-center">
            © 2025 Cetasense
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full opacity-30"></div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar