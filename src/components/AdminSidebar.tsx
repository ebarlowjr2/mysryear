'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  GraduationCap, School, DollarSign, Heart, Bell, Calendar,
  FileText, Target, Clock, CheckSquare, BookOpen, Award,
  Users, ChevronLeft, ChevronRight, Home, Menu, X
} from 'lucide-react'

interface AdminSidebarProps {
  userRole: 'student' | 'parent' | 'counselor'
}

export default function AdminSidebar({ userRole }: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  const mainModules = [
    { title: 'Dashboard', icon: Home, href: '/dashboard', description: 'Overview & quick stats' },
    { title: 'Academic Progress', icon: GraduationCap, href: '/dashboard/academics', description: 'Grades & requirements' },
    { title: 'College Readiness', icon: School, href: '/dashboard/college', description: 'Applications & essays' },
    { title: 'Scholarships', icon: DollarSign, href: '/dashboard/scholarships', description: 'Find opportunities' },
    { title: 'Service Hours', icon: Heart, href: '/dashboard/service', description: 'Community service' },
    { title: 'Notifications', icon: Bell, href: '/dashboard/notifications', description: 'Alerts & reminders' }
  ]

  const preparationItems = [
    {
      title: 'Graduation Requirements',
      icon: Target,
      items: [
        'English: 4 credits',
        'Math: 4 credits', 
        'Science: 3 credits',
        'Social Studies: 3 credits',
        'Foreign Language: 2 credits',
        'PE/Health: 1.5 credits',
        'Electives: 6.5 credits'
      ]
    },
    {
      title: 'College Timeline',
      icon: Calendar,
      items: [
        'Sep: Finalize college list',
        'Oct: Submit early apps',
        'Nov: Complete FAFSA',
        'Dec: Submit regular apps',
        'Jan: Submit final transcripts',
        'May: Make final decision'
      ]
    },
    {
      title: 'Test Dates',
      icon: BookOpen,
      items: [
        'SAT: Oct, Nov, Dec, Mar, May, Jun',
        'ACT: Sep, Oct, Dec, Feb, Apr, Jun',
        'AP Exams: May',
        'Subject Tests: Check dates'
      ]
    },
    {
      title: 'Essential Documents',
      icon: FileText,
      items: [
        'Official transcripts',
        'Letters of recommendation',
        'Personal essays',
        'Activity resume',
        'Financial aid forms',
        'Test score reports'
      ]
    },
    {
      title: 'Key Deadlines',
      icon: Clock,
      items: [
        'Early Decision: Nov 1-15',
        'Regular Decision: Jan 1-15',
        'FAFSA: Oct 1 (priority)',
        'CSS Profile: Check dates',
        'Scholarship apps: Varies',
        'Housing deposits: May 1'
      ]
    }
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg glass text-white"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-80'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        sidebar overflow-y-auto
      `}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            {!isCollapsed && (
              <div>
                <h2 className="text-xl font-bold gradient-text">My Senior Year</h2>
                <p className="text-sm text-gray-400 capitalize">{userRole} Portal</p>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {/* Main Navigation */}
          <div className="mb-8">
            {!isCollapsed && (
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Main Modules
              </h3>
            )}
            <nav className="space-y-2">
              {mainModules.map((module) => {
                const Icon = module.icon
                return (
                  <Link
                    key={module.href}
                    href={module.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      flex items-center p-3 rounded-lg transition-all duration-200
                      ${isActive(module.href) 
                        ? 'sidebar-item active' 
                        : 'sidebar-item hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="ml-3">
                        <div className="font-medium">{module.title}</div>
                        <div className="text-xs text-gray-400">{module.description}</div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Student Preparation Guide */}
          {!isCollapsed && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Preparation Guide
              </h3>
              <div className="space-y-4">
                {preparationItems.map((section, index) => {
                  const Icon = section.icon
                  return (
                    <div key={index} className="card p-4">
                      <div className="flex items-center mb-3">
                        <Icon size={18} className="text-purple-400 mr-2" />
                        <h4 className="font-semibold text-sm">{section.title}</h4>
                      </div>
                      <ul className="space-y-1">
                        {section.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-xs text-gray-400 flex items-start">
                            <CheckSquare size={12} className="text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
