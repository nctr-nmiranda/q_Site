'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Play, ChevronDown, ChevronUp, Search, Layers, Eye, EyeOff } from 'lucide-react'

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

interface Document {
  id: string
  title: string
  filename: string
  totalQuestions: number
  createdAt: string
  questions: Question[]
}

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null)
  
  const [currentPage, setCurrentPage] = useState(0)
  const [questionsPerPage, setQuestionsPerPage] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [questionFilter, setQuestionFilter] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const fetchDocument = async () => {
      const resolvedParams = await params
      
      try {
        const res = await fetch(`/api/documents/${resolvedParams.id}`)
        const data = await res.json()
        
        if (data.success) {
          setDocument(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch document:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDocument()
  }, [params])

  const filteredQuestions = useMemo(() => {
    if (!document) return []
    
    let questions = document.questions
    
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
  }, [document, searchQuery, questionFilter])

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

  if (!document) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Document not found</p>
          <Link href="/upload" className="text-blue-600 hover:underline">
            Go to Upload
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/upload" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-xl font-bold text-slate-900">Question Preview</span>
          <Link
            href={`/quiz/${document.id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Start Quiz
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{document.title}</h1>
              <p className="text-slate-600">{document.filename} • {document.totalQuestions} questions</p>
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
              {showAll ? 'Show Paginated' : 'Show All'}
            </button>
          </div>

          {searchQuery || questionFilter ? (
            <p className="text-sm text-slate-600 mt-3">
              Showing {filteredQuestions.length} of {document.totalQuestions} questions
            </p>
          ) : !showAll ? (
            <p className="text-sm text-slate-600 mt-3">
              Page {currentPage + 1} of {totalPages} • Questions {currentPage * questionsPerPage + 1}–{Math.min((currentPage + 1) * questionsPerPage, document.totalQuestions)} of {document.totalQuestions}
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
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i
              } else if (currentPage < 3) {
                pageNum = i
              } else if (currentPage > totalPages - 3) {
                pageNum = totalPages - 5 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium ${
                    currentPage === pageNum 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {pageNum + 1}
                </button>
              )
            })}
            
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
                {expandedQuestion === question.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              
              {expandedQuestion === question.id && (
                <div className="p-4 pt-0 border-t bg-slate-50">
                  <div className="space-y-2 mb-4">
                    {question.choices.map((choice) => (
                      <div
                        key={choice.id}
                        className={`p-3 rounded-lg flex items-center gap-3 ${
                          choice.id === question.correctAnswer
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-white'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-sm font-medium ${
                          choice.id === question.correctAnswer
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {choice.id}
                        </span>
                        <span className="text-slate-700">{choice.text}</span>
                      </div>
                    ))}
                  </div>
                  
                  {question.explanation && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-900 mb-1">Explanation</p>
                      <p className="text-blue-800 text-sm">{question.explanation}</p>
                    </div>
                  )}
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
