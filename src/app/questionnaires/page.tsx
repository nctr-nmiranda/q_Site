'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Trash2, Play, Edit, Clock } from 'lucide-react'

interface Questionnaire {
  id: string
  name: string
  examTitle: string
  totalQuestions: number
  createdAt: string
  updatedAt: string
}

export default function QuestionnairesPage() {
  const router = useRouter()
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchQuestionnaires()
  }, [])

  const fetchQuestionnaires = async () => {
    try {
      const res = await fetch('/api/questionnaires')
      const data = await res.json()
      if (data.success) {
        setQuestionnaires(data.data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to load questionnaires')
    } finally {
      setLoading(false)
    }
  }

  const deleteQuestionnaire = async (id: string) => {
    if (!confirm('Delete this questionnaire?')) return
    
    try {
      const res = await fetch(`/api/questionnaires/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setQuestionnaires(questionnaires.filter(q => q.id !== id))
      }
    } catch (err) {
      alert('Failed to delete questionnaire')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">My Questionnaires</h1>
          <Link
            href="/upload"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Upload New
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">{error}</div>
        )}

        {questionnaires.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No questionnaires yet</h3>
            <p className="text-slate-600 mb-4">Upload a document to create your first questionnaire</p>
            <Link href="/upload" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Upload Document
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {questionnaires.map((q) => (
              <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{q.name}</h3>
                    <p className="text-sm text-slate-500">{q.examTitle}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span>{q.totalQuestions} questions</span>
                      <span>•</span>
                      <span>Updated {formatDate(q.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/questionnaires/${q.id}/edit`}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => deleteQuestionnaire(q.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <Link
                      href={`/quiz/${q.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" /> Start Quiz
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
