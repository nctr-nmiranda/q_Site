'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, ArrowLeft, Clock } from 'lucide-react'

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

interface QuizData {
  sessionId: string
  documentTitle: string
  totalQuestions: number
  questionsPerPage: number
  timerEnabled: boolean
  timerMinutes: number | null
  startedAt: string
  questions: Question[]
}

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { isCorrect: boolean; correctAnswer: string; submitted: boolean; selectedAnswer: string }>>({})
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [timeUsed, setTimeUsed] = useState(0)

  useEffect(() => {
    const initQuiz = async () => {
      const resolvedParams = await params
      const id = resolvedParams.id
      
      let sessionId = id
      let isQuestionnaire = false
      
      try {
        let res = await fetch(`/api/quiz/${id}`)
        let data = await res.json()
        
        if (!data.success || data.error === 'Session not found') {
          res = await fetch(`/api/questionnaires/${id}`)
          data = await res.json()
          
          if (data.success) {
            isQuestionnaire = true
          }
        }
        
        if (isQuestionnaire) {
          res = await fetch('/api/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionnaireId: id,
              shuffleQuestions: false,
              shuffleAnswers: true,
              questionsPerPage: 10,
              timerEnabled: false,
              timerMinutes: null
            })
          })
          data = await res.json()
          
          if (data.success) {
            router.replace(`/quiz/${data.data.sessionId}`)
            return
          } else {
            alert(data.error || 'Failed to start quiz')
            router.push('/questionnaires')
            return
          }
        }
        
        if (data.success) {
          const sessionData = data.data
          
          if (sessionData.status === 'completed') {
            router.push(`/results/${id}`)
            return
          }
          
          setQuizData({
            sessionId: sessionData.sessionId,
            documentTitle: sessionData.documentTitle,
            totalQuestions: sessionData.totalQuestions,
            questionsPerPage: sessionData.questionsPerPage,
            timerEnabled: sessionData.timerEnabled,
            timerMinutes: sessionData.timerMinutes,
            startedAt: sessionData.startedAt,
            questions: sessionData.questions
          })
          
          if (sessionData.timerEnabled && sessionData.timerMinutes) {
            setTimeLeft(sessionData.timerMinutes * 60)
          }
        } else {
          alert(data.error || 'Failed to load quiz')
          router.push('/questionnaires')
        }
      } catch (err) {
        alert('Failed to load quiz')
        router.push('/questionnaires')
      } finally {
        setLoading(false)
      }
    }
    
    initQuiz()
  }, [params, router])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || completed) return
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          handleFinish()
          return 0
        }
        return prev - 1
      })
      setTimeUsed(prev => prev + 1)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [timeLeft, completed])

  const handleAnswer = async (questionId: string, selectedAnswer: string) => {
    if (answers[questionId]?.submitted) return
    
    try {
      const res = await fetch(`/api/quiz/${quizData!.sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, selectedAnswer })
      })
      const data = await res.json()
      
      if (data.success) {
        setAnswers(prev => ({
          ...prev,
          [questionId]: {
            isCorrect: data.data.isCorrect,
            correctAnswer: data.data.correctAnswer,
            submitted: true,
            selectedAnswer
          }
        }))
      }
    } catch (err) {
      console.error('Failed to submit answer:', err)
    }
  }

  const handleFinish = async () => {
    if (completed) return
    setCompleted(true)
    
    try {
      await fetch(`/api/quiz/${quizData!.sessionId}`, { method: 'POST' })
      router.push(`/results/${quizData!.sessionId}`)
    } catch (err) {
      console.error('Failed to finish quiz:', err)
    }
  }

  const getCurrentPageQuestions = () => {
    if (!quizData) return []
    const start = currentPage * quizData.questionsPerPage
    const end = start + quizData.questionsPerPage
    return quizData.questions.slice(start, end)
  }

  const getAnsweredCount = () => {
    return Object.values(answers).filter(a => a.submitted).length
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!quizData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Quiz not found</p>
          <Link href="/upload" className="text-blue-600 hover:underline">
            Go to Upload
          </Link>
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(quizData.totalQuestions / quizData.questionsPerPage)
  const currentQuestions = getCurrentPageQuestions()
  const startQuestionNum = currentPage * quizData.questionsPerPage + 1
  const endQuestionNum = Math.min((currentPage + 1) * quizData.questionsPerPage, quizData.totalQuestions)
  const answeredOnPage = currentQuestions.filter(q => answers[q.id]?.submitted).length

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/upload" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Exit
          </Link>
          
          <div className="flex items-center gap-4">
            {quizData.timerEnabled && timeLeft !== null && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                timeLeft < 60 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </div>
            )}
            <span className="text-sm text-slate-600">
              {getAnsweredCount()}/{quizData.totalQuestions} answered
            </span>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Page {currentPage + 1} of {totalPages}
            </span>
            <span className="text-sm text-slate-500">
              Questions {startQuestionNum}–{endQuestionNum} of {quizData.totalQuestions}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300" 
              style={{ width: `${(getAnsweredCount() / quizData.totalQuestions) * 100}%` }} 
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {currentQuestions.map((question, index) => {
            const answer = answers[question.id]
            const isAnswered = answer?.submitted
            
            return (
              <div key={question.id} className="bg-white rounded-2xl border p-6">
                <div className="flex items-start gap-4 mb-4">
                  <span className="bg-blue-100 text-blue-700 font-semibold px-3 py-1 rounded-lg text-sm">
                    Q{question.questionNumber}
                  </span>
                  {isAnswered && (
                    answer.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )
                  )}
                </div>
                
                <p className="text-lg text-slate-900 mb-6">{question.questionText}</p>
                
                <div className="space-y-3">
                  {question.choices.map((choice) => {
                    const letter = choice.id
                    const isSelected = answer?.submitted && answers[question.id]?.selectedAnswer === letter
                    const isCorrectAnswer = answer?.correctAnswer === letter
                    const showResult = isAnswered
                    
                    let bgClass = 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    if (showResult) {
                      if (isCorrectAnswer) {
                        bgClass = 'bg-green-50 border-green-300'
                      } else if (isSelected) {
                        bgClass = 'bg-red-50 border-red-300'
                      }
                    }
                    
                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleAnswer(question.id, letter)}
                        disabled={isAnswered}
                        className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-colors ${bgClass} ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold ${
                          showResult && isCorrectAnswer ? 'bg-green-500 text-white' :
                          showResult && isSelected ? 'bg-red-500 text-white' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {letter}
                        </span>
                        <span className="text-slate-900 flex-1">{choice.text}</span>
                        {showResult && isCorrectAnswer && (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        )}
                        {showResult && isSelected && !isCorrectAnswer && (
                          <XCircle className="w-6 h-6 text-red-500" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {isAnswered && question.explanation && (
                  <div className="bg-blue-50 rounded-xl p-4 mt-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Explanation</h4>
                    <p className="text-blue-800">{question.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex items-center gap-2">
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
          </div>

          {currentPage === totalPages - 1 ? (
            <button
              onClick={handleFinish}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Finish Quiz
            </button>
          ) : (
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
