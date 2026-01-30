'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, Check, Trash2, Edit2, X, Calendar, ArrowLeft } from 'lucide-react'

type TaskStatus = 'todo' | 'doing' | 'done'
type TaskCategory = 'Applications' | 'Essays' | 'Testing' | 'Scholarships' | 'Financial Aid' | 'Campus Visits' | 'Housing' | 'Enrollment' | 'Documents' | 'Admin/Other'

type Task = {
  id: string
  user_id: string
  title: string
  category: TaskCategory
  status: TaskStatus
  month: string
  due_date: string | null
  notes: string | null
  pinned: boolean
  assigned_by_parent_id?: string | null
  created_at: string
  updated_at: string
}

const CATEGORIES: TaskCategory[] = [
  'Applications', 'Essays', 'Testing', 'Scholarships', 'Financial Aid',
  'Campus Visits', 'Housing', 'Enrollment', 'Documents', 'Admin/Other'
]

const MONTHS = ['Aug-Sep', 'Oct', 'Nov-Dec', 'Jan-Mar', 'Apr-May', 'Summer']

function getCurrentMonth(): string {
  const month = new Date().getMonth()
  if (month >= 7 && month <= 8) return 'Aug-Sep'
  if (month === 9) return 'Oct'
  if (month >= 10 && month <= 11) return 'Nov-Dec'
  if (month >= 0 && month <= 2) return 'Jan-Mar'
  if (month >= 3 && month <= 4) return 'Apr-May'
  return 'Summer'
}

export default function TasksPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  const supabase = createClient()

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading tasks:', error)
        return
      }

      setTasks(data || [])
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const createTask = async (taskData: Partial<Task>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_tasks')
        .insert({
          user_id: user.id,
          title: taskData.title,
          category: taskData.category || 'Admin/Other',
          status: 'todo',
          month: taskData.month || getCurrentMonth(),
          due_date: taskData.due_date || null,
          notes: taskData.notes || null,
          pinned: false
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating task:', error)
        return
      }

      setTasks(prev => [data, ...prev])
      setShowCreateModal(false)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { data, error } = await supabase
        .from('user_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        console.error('Error updating task:', error)
        return
      }

      setTasks(prev => prev.map(t => t.id === taskId ? data : t))
      setEditingTask(null)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const toggleComplete = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    await updateTask(task.id, { status: newStatus })
  }

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return

    try {
      const { error } = await supabase
        .from('user_tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        console.error('Error deleting task:', error)
        return
      }

      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return task.status !== 'done'
    if (filter === 'completed') return task.status === 'done'
    return true
  })

  const pendingCount = tasks.filter(t => t.status !== 'done').length
  const completedCount = tasks.filter(t => t.status === 'done').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-brand-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-black text-slate-900">Tasks</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 py-2 px-4 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="card p-4 flex-1 text-center">
            <div className="text-2xl font-bold text-brand-600">{pendingCount}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
          <div className="card p-4 flex-1 text-center">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'pending' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'completed' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-slate-500">No tasks yet. Create your first task!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => toggleComplete(task)}
                onEdit={() => setEditingTask(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </div>
        )}

        {showCreateModal && (
          <TaskModal
            onClose={() => setShowCreateModal(false)}
            onSave={createTask}
          />
        )}

        {editingTask && (
          <TaskModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onSave={(data) => updateTask(editingTask.id, data)}
          />
        )}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete
}: {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div className={`card p-4 ${task.status === 'done' ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
            task.status === 'done'
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-slate-300 hover:border-brand-500'
          }`}
        >
          {task.status === 'done' && <Check className="w-4 h-4" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                {task.title}
              </h3>
              {task.assigned_by_parent_id && (
                <span className="text-xs text-purple-600 font-medium">[Assigned by Parent]</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onEdit}
                className="p-1 text-slate-400 hover:text-brand-600"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-slate-400 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {task.category}
            </span>
            {task.due_date && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
                <Calendar className="w-3 h-3" />
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
          
          {task.notes && (
            <p className="text-sm text-slate-500 mt-2">{task.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskModal({
  task,
  onClose,
  onSave
}: {
  task?: Task
  onClose: () => void
  onSave: (data: Partial<Task>) => void
}) {
  const [title, setTitle] = useState(task?.title || '')
  const [category, setCategory] = useState<TaskCategory>(task?.category || 'Admin/Other')
  const [month, setMonth] = useState(task?.month || getCurrentMonth())
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [notes, setNotes] = useState(task?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSave({
      title: title.trim(),
      category,
      month,
      due_date: dueDate || null,
      notes: notes.trim() || null
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="input w-full px-4 py-2 rounded-lg"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="input w-full px-4 py-2 rounded-lg"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full px-4 py-2 rounded-lg min-h-[80px]"
              placeholder="Additional details..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 btn-primary py-2 px-4 rounded-lg disabled:opacity-50"
            >
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
