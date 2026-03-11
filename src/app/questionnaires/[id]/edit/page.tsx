'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, ChevronDown, ChevronUp, Plus, Trash2, Search, Layers, Eye, EyeOff } from 'lucide-react'

interface Choice {
  id: string
  text: string
}

interface Question {
  id: string
  questionNumber: number
  questionText: string
  choices: Choice[]
  correctAnswer: string
  explanation: string | null
}

interface Questionnaire {
  id: string
  name: string
  examTitle: string
  totalQuestions: number
  questions: Question[]
}

export default function EditQuestionnairePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  
  const [name, setName] = useState('')
  const [examTitle, setExamTitle] = useState('')
  
  const [currentPage, setCurrentPage] = useState(0)
  const [questionsPerPage, setQuestionsPerPage] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [questionFilter, setQuestionFilter] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      const resolvedParams = await params
      
      try {
        const res = await fetch(`/api/questionnaires/${resolvedParams.id}`)
        const data = await res.json()
        
        if (data.success) {
          setQuestionnaire(data.data)
          setName(data.data.name)
          setExamTitle(data.data.examTitle)
        }
      } catch (err) {
        console.error('Failed to fetch questionnaire:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchQuestionnaire()
  }, [params])

  const handleSave = async () => {
    if (!questionnaire) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/questionnaires/${questionnaire.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          examTitle,
          questions: questionnaire.questions
        })
      })
      const data = await res.json()
      
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        alert(data.error || 'Failed to save')
      }
    } catch (err) {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updateQuestion = (questionId: string, field: string, value: any) => {
    if (!questionnaire) return
    
    setQuestionnaire({
      ...questionnaire,
      questions: questionnaire.questions.map(q => {
        if (q.id !== questionId) return q
        
        if (field === 'choice') {
          const choiceIndex = value.index
          const newChoices = [...q.choices]
          newChoices[choiceIndex] = { ...newChoices[choiceIndex], text: value.text }
          return { ...q, choices: newChoices }
        }
        
        return { ...q, [field]: value }
      })
    })
  }

  const addQuestion = () => {
    if (!questionnaire) return
    
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      questionNumber: questionnaire.questions.length + 1,
      questionText: '',
      choices: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' }
      ],
      correctAnswer: 'A',
      explanation: ''
    }
    
    setQuestionnaire({
      ...questionnaire,
      questions: [...questionnaire.questions, newQuestion]
    })
    setExpandedQuestion(newQuestion.id)
  }

  const deleteQuestion = (questionId: string) => {
    if (!questionnaire) return
    if (!confirm('Delete this question?')) return
    
    const newQuestions = questionnaire.questions
      .filter(q => q.id !== questionId)
      .map((q, i) => ({ ...q, questionNumber: i + 1 }))
    
    setQuestionnaire({
      ...questionnaire,
      questions: newQuestions
    })
    
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null)
    }
  }

  const filteredQuestions = useMemo(() => {
    if (!questionnaire) return []
    
    let questions = [...questionnaire.questions]
    
    if (questionFilter) {
      const filterNum = parseInt(questionFilter)
      if (!isNaN(filterNum)) {
        questions = questions.filter(q => q.questionNumber === filterNum)
      }
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      questions = questions.filter(q => 
        q.questionText.toLowerCase().includes(query) ||
        q.explanation?.toLowerCase().includes(query) ||
        q.choices.some(c => c.text.toLowerCase().includes(query))
      )
    }
    
    return questions
  }, [questionnaire, searchQuery, questionFilter])

  const paginatedQuestions = useMemo(() => {
    if (showAll) return filteredQuestions
    
    const start = currentPage * questionsPerPage
    return filteredQuestions.slice(start, start + questionsPerPage)
  }, [filteredQuestions, currentPage, questionsPerPage, showAll])

  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage)

  const toggleQuestion = (id: string) => {
    setExpandedQuestion(expandedQuestion === id ? null : id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!questionnaire) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Questionnaire not found</p>
          <Link href="/questionnaires" className="text-blue-600 hover:underline">
            Go to Questionnaires
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/questionnaires" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            {saved && <span className="text-green-600 text-sm">Saved!</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Questionnaire Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-slate-700"
                placeholder="My Exam Reviewer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exam Title</label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-slate-700"
                placeholder="AWS Solutions Architect"
              />
            </div>
            <div className="text-sm text-slate-500">
              {questionnaire.questions.length} questions
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(0)
                }}
                className="flex-1 border-0 bg-transparent focus:outline-none text-slate-700 placeholder-slate-400"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Q#</span>
              <input
                type="number"
                placeholder="Filter"
                value={questionFilter}
                onChange={(e) => {
                  setQuestionFilter(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-20 px-3 py-2 border rounded-lg text-slate-700 text-sm"
                min={1}
              />
            </div>

            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <select
                value={questionsPerPage}
                onChange={(e) => {
                  setQuestionsPerPage(Number(e.target.value))
                  setCurrentPage(0)
                  setShowAll(false)
                }}
                className="px-3 py-2 border rounded-lg text-slate-700 text-sm bg-white"
                disabled={showAll}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={25}>25 / page</option>
              </select>
            </div>

            <button
              onClick={() => {
                setShowAll(!showAll)
                setCurrentPage(0)
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                showAll 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {showAll ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAll ? 'Paginated' : 'Show All'}
            </button>

            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          {searchQuery || questionFilter ? (
            <p className="text-sm text-slate-600 mt-3">
              Showing {filteredQuestions.length} of {questionnaire.questions.length} questions
            </p>
          ) : !showAll ? (
            <p className="text-sm text-slate-600 mt-3">
              Page {currentPage + 1} of {totalPages}
            </p>
          ) : null}
        </div>

        {!showAll && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            
            <span className="px-4 text-slate-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        <div className="space-y-3">
          {paginatedQuestions.map((question) => (
            <div key={question.id} className="bg-white rounded-xl border overflow-hidden">
              <button
                onClick={() => toggleQuestion(question.id)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-lg text-sm">
                    Q{question.questionNumber}
                  </span>
                  <span className="text-slate-900 line-clamp-1">
                    {question.questionText || '(No question text)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Answer: {question.correctAnswer}
                  </span>
                  {expandedQuestion === question.id ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>
              
              {expandedQuestion === question.id && (
                <div className="p-4 pt-0 border-t bg-slate-50 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Question Text</label>
                    <textarea
                      value={question.questionText}
                      onChange={(e) => updateQuestion(question.id, 'questionText', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-slate-700"
                      rows={3}
                      placeholder="Enter question text..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Answer Choices</label>
                    <div className="space-y-2">
                      {question.choices.map((choice, index) => (
                        <div key={choice.id} className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                            question.correctAnswer === choice.id 
                              ? 'bg-green-500 text-white' 
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {choice.id}
                          </span>
                          <input
                            type="text"
                            value={choice.text}
                            onChange={(e) => updateQuestion(question.id, 'choice', { index, text: e.target.value })}
                            className="flex-1 px-3 py-2 border rounded-lg text-slate-700"
                            placeholder={`Choice ${choice.id}...`}
                          />
                          <button
                            onClick={() => updateQuestion(question.id, 'correctAnswer', choice.id)}
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              question.correctAnswer === choice.id
                                ? 'bg-green-500 text-white'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            Correct
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
                    <textarea
                      value={question.explanation || ''}
                      onChange={(e) => updateQuestion(question.id, 'explanation', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-slate-700"
                      rows={3}
                      placeholder="Enter explanation..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => deleteQuestion(question.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Question
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {!showAll && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50"
            >
              Previous
            </button>
            
            <span className="px-4 text-slate-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
