'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Award, CheckCircle, XCircle, RefreshCw, Download } from 'lucide-react'

interface Choice {
  id: string
  text: string
}

interface Answer {
  questionId: string
  questionNumber: number
  questionText: string
  choices: Choice[]
  selectedAnswer: string | null
  correctAnswer: string
  isCorrect: boolean | null
  explanation: string | null
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [results, setResults] = useState<{
    sessionId: string
    documentId: string
    documentTitle: string
    totalQuestions: number
    correctAnswers: number
    score: number
    timeTaken: number
    answers: Answer[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      const resolvedParams = await params
      
      try {
        const res = await fetch(`/api/quiz/${resolvedParams.id}`)
        const data = await res.json()
        
        if (data.success) {
          setResults(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch results:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchResults()
  }, [params])

  const exportToJSON = () => {
    if (!results) return
    
    const data = {
      quiz: results.documentTitle,
      score: `${results.correctAnswers}/${results.totalQuestions} (${results.score}%)`,
      timeTaken: `${Math.floor(results.timeTaken / 60)}m ${results.timeTaken % 60}s`,
      questions: results.answers.map(a => ({
        questionNumber: a.questionNumber,
        question: a.questionText,
        correctAnswer: a.correctAnswer,
        selectedAnswer: a.selectedAnswer,
        isCorrect: a.isCorrect,
        explanation: a.explanation
      }))
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${results.documentTitle}-quiz-results.json`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Results not found</p>
          <Link href="/upload" className="text-blue-600 hover:underline">
            Go to Upload
          </Link>
        </div>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/upload" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Upload New
          </Link>
          <span className="text-xl font-bold text-slate-900">Quiz Results</span>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border p-8 mb-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-10 h-10 text-blue-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{results.documentTitle}</h1>
          
          <div className="flex items-center justify-center gap-8 mb-6">
            <div>
              <p className={`text-5xl font-bold ${getScoreColor(results.score)}`}>
                {results.score}%
              </p>
              <p className="text-slate-600">Score</p>
            </div>
            <div className="w-px h-16 bg-slate-200"></div>
            <div>
              <p className="text-3xl font-bold text-slate-900">
                {results.correctAnswers}/{results.totalQuestions}
              </p>
              <p className="text-slate-600">Correct</p>
            </div>
            <div className="w-px h-16 bg-slate-200"></div>
            <div>
              <p className="text-3xl font-bold text-slate-900">
                {Math.floor(results.timeTaken / 60)}:{(results.timeTaken % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-slate-600">Time</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <Link
              href={`/quiz/${results.documentId}`}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retake Quiz
            </Link>
            <button
              onClick={exportToJSON}
              className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-2 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" /> Export Results
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-4">Question Review</h2>
        
        <div className="space-y-4">
          {results.answers.map((answer) => (
            <div key={answer.questionId} className="bg-white rounded-xl border p-6">
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  answer.isCorrect ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {answer.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : answer.isCorrect === null ? (
                    <span className="text-slate-400 text-sm">-</span>
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-slate-500">Question {answer.questionNumber}</span>
                    {answer.isCorrect !== null && (
                      <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                        answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {answer.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-slate-900 mb-4">{answer.questionText}</p>
                  
                  <div className="space-y-2 mb-4">
                    {answer.choices.map((choice) => {
                      const isSelected = answer.selectedAnswer === choice.id
                      const isCorrect = answer.correctAnswer === choice.id
                      
                      return (
                        <div
                          key={choice.id}
                          className={`p-3 rounded-lg flex items-center gap-3 ${
                            isCorrect ? 'bg-green-50 border border-green-200' :
                            isSelected ? 'bg-red-50 border border-red-200' :
                            'bg-slate-50'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-sm font-medium ${
                            isCorrect ? 'bg-green-500 text-white' :
                            isSelected ? 'bg-red-500 text-white' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {choice.id}
                          </span>
                          <span className={isCorrect ? 'text-green-800' : isSelected ? 'text-red-800' : 'text-slate-700'}>
                            {choice.text}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  
                  {answer.explanation && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 mb-1">Explanation</p>
                      <p className="text-blue-800 text-sm">{answer.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
