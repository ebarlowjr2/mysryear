'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import AdminSidebar from '../../../components/AdminSidebar'
import { ArrowLeft, ExternalLink, Bookmark, BookmarkCheck, Search } from 'lucide-react'

interface Scholarship {
  id: string
  title: string
  deadline: string
  eligibility: {
    gpa_min?: number
    grade_level?: string
    financial_need?: boolean
    leadership?: boolean
    community_service?: number
  }
  link: string
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  role: 'student' | 'parent' | 'counselor'
}

export default function ScholarshipsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [scholarships, setScholarships] = useState<Scholarship[]>([])
  const [bookmarkedScholarships, setBookmarkedScholarships] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profile)

      if (profile) {
        await loadScholarships()
        await loadBookmarks(user.id)
      }
      
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadScholarships = async () => {
    const sampleScholarships: Scholarship[] = [
      {
        id: '1',
        title: 'National Merit Scholarship',
        deadline: '2025-10-15',
        eligibility: { gpa_min: 3.5, grade_level: 'senior' },
        link: 'https://www.nationalmerit.org/',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Gates Millennium Scholars Program',
        deadline: '2025-01-15',
        eligibility: { gpa_min: 3.3, financial_need: true },
        link: 'https://www.gmsp.org/',
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Coca-Cola Scholars Program',
        deadline: '2024-10-31',
        eligibility: { leadership: true, community_service: 100 },
        link: 'https://www.coca-colascholarsfoundation.org/',
        created_at: new Date().toISOString()
      },
      {
        id: '4',
        title: 'Dell Scholars Program',
        deadline: '2024-12-01',
        eligibility: { gpa_min: 2.4, financial_need: true },
        link: 'https://www.dellscholars.org/',
        created_at: new Date().toISOString()
      },
      {
        id: '5',
        title: 'Jack Kent Cooke Foundation Scholarship',
        deadline: '2024-11-14',
        eligibility: { gpa_min: 3.5, financial_need: true },
        link: 'https://www.jkcf.org/',
        created_at: new Date().toISOString()
      }
    ]

    setScholarships(sampleScholarships)
  }

  const loadBookmarks = async (userId: string) => {
    const { data: bookmarks } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'scholarship_bookmark')

    const bookmarkedIds = (bookmarks || []).map(bookmark => {
      const data = JSON.parse(bookmark.message)
      return data.scholarship_id
    })

    setBookmarkedScholarships(bookmarkedIds)
  }

  const toggleBookmark = async (scholarshipId: string) => {
    if (!user) return

    const isBookmarked = bookmarkedScholarships.includes(scholarshipId)

    if (isBookmarked) {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('type', 'scholarship_bookmark')
        .eq('message', JSON.stringify({ scholarship_id: scholarshipId }))

      if (!error) {
        setBookmarkedScholarships(prev => prev.filter(id => id !== scholarshipId))
      }
    } else {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          message: JSON.stringify({ scholarship_id: scholarshipId }),
          type: 'scholarship_bookmark',
          read: true
        }])

      if (!error) {
        setBookmarkedScholarships(prev => [...prev, scholarshipId])
      }
    }
  }

  const filteredScholarships = scholarships.filter(scholarship =>
    scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scholarship.link.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isDeadlineSoon = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays >= 0
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen flex">
      <AdminSidebar userRole={profile?.role || 'student'} />
      
      <div className="flex-1 md:ml-80">
        <nav className="glass border-b border-gray-700 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-bold gradient-text">Scholarship Finder</h1>
            </div>
          </div>
        </nav>

        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
                  <span className="text-white font-semibold">SC</span>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-400">Available Scholarships</dt>
                  <dd className="text-2xl font-bold text-white">{scholarships.length}</dd>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                  <span className="text-white font-semibold">BM</span>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-400">Bookmarked</dt>
                  <dd className="text-2xl font-bold text-white">{bookmarkedScholarships.length}</dd>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
                  <span className="text-white font-semibold">DL</span>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-400">Deadlines Soon</dt>
                  <dd className="text-2xl font-bold text-white">{scholarships.filter(s => isDeadlineSoon(s.deadline)).length}</dd>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Search scholarships..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Scholarships Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScholarships.map((scholarship) => {
              const isBookmarked = bookmarkedScholarships.includes(scholarship.id)
              const deadlineSoon = isDeadlineSoon(scholarship.deadline)
              
              return (
                <div key={scholarship.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-white mb-2">
                          {scholarship.title}
                        </h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className={`flex items-center space-x-1 ${deadlineSoon ? 'text-red-600 font-medium' : ''}`}>
                            <span>Deadline:</span>
                            <span>{new Date(scholarship.deadline).toLocaleDateString()}</span>
                            {deadlineSoon && <span className="text-xs">(Soon!)</span>}
                          </div>
                          
                          {scholarship.eligibility && (
                            <div className="space-y-1">
                              <span className="font-medium">Eligibility:</span>
                              <ul className="list-disc list-inside text-xs space-y-1">
                                {scholarship.eligibility.gpa_min && (
                                  <li>Minimum GPA: {scholarship.eligibility.gpa_min}</li>
                                )}
                                {scholarship.eligibility.grade_level && (
                                  <li>Grade Level: {scholarship.eligibility.grade_level}</li>
                                )}
                                {scholarship.eligibility.financial_need && (
                                  <li>Financial need required</li>
                                )}
                                {scholarship.eligibility.leadership && (
                                  <li>Leadership experience required</li>
                                )}
                                {scholarship.eligibility.community_service && (
                                  <li>Community service: {scholarship.eligibility.community_service}+ hours</li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleBookmark(scholarship.id)}
                        className={`ml-2 p-1 rounded ${
                          isBookmarked 
                            ? 'text-yellow-600 hover:text-yellow-700' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                      </button>
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center">
                      <a
                        href={scholarship.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-yellow-600 hover:text-yellow-700 text-sm font-medium"
                      >
                        <span>Learn More</span>
                        <ExternalLink size={14} />
                      </a>
                      
                      {deadlineSoon && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Deadline Soon
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredScholarships.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {searchTerm ? 'No scholarships found matching your search.' : 'No scholarships available.'}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
