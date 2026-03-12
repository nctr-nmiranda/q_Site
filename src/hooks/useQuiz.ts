'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

export interface Answer {
  isCorrect: boolean
  correctAnswer: string
  submitted: boolean
  selectedAnswer: string
  pending?: boolean
}

export interface Question {
  id: string
  questionNumber: number
  questionText: string
  choices: { id: string; text: string }[]
  correctAnswer: string
  explanation: string | null
}

export interface QuizData {
  sessionId: string
  documentTitle: string
  totalQuestions: number
  questionsPerPage: number
  questions: Question[]
}

const QUESTIONS_PER_PAGE_OPTIONS = [10, 15, 20]
const STORAGE_KEY_PREFIX = 'quiz_answers_'

interface UseQuizOptions {
  sessionId: string
  initialData: QuizData
  onSubmitBatch: (answers: { questionId: string; selectedAnswer: string }[]) => Promise<{
    results: { questionId: string; isCorrect: boolean; correctAnswer: string }[]
  }>
  onSubmitQuiz?: () => Promise<void>
}

export function useQuiz({ sessionId, initialData, onSubmitBatch, onSubmitQuiz }: UseQuizOptions) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [questionsPerPage, setQuestionsPerPage] = useState(initialData.questionsPerPage || 10)
  const [showAnswers, setShowAnswers] = useState(false)
  const [showExplanations, setShowExplanations] = useState(false)
  const [showAnswersLoading, setShowAnswersLoading] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const totalPages = Math.ceil(initialData.totalQuestions / questionsPerPage)

  const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.answers) {
          setAnswers(parsed.answers)
        }
        if (parsed.currentPage) {
          setCurrentPage(parsed.currentPage)
        }
      } catch (e) {
        console.error('Failed to parse stored answers:', e)
      }
    }
  }, [storageKey])

  useEffect(() => {
    const stored = localStorage.getItem(`quiz_settings_${sessionId}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.questionsPerPage) {
          setQuestionsPerPage(parsed.questionsPerPage)
        }
      } catch (e) {
        console.error('Failed to parse settings:', e)
      }
    }
  }, [sessionId])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    const popStateHandler = (e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm(
          'You have unsaved answers. Are you sure you want to leave?'
        )
        if (!confirmLeave) {
          e.preventDefault()
          window.history.pushState(null, '', window.location.href)
        } else {
          setHasUnsavedChanges(false)
        }
      }
    }

    window.addEventListener('popstate', popStateHandler)
    return () => window.removeEventListener('popstate', popStateHandler)
  }, [hasUnsavedChanges])

  const saveToStorage = useCallback((newAnswers: Record<string, Answer>, page: number) => {
    localStorage.setItem(storageKey, JSON.stringify({
      answers: newAnswers,
      currentPage: page
    }))
  }, [storageKey])

  const currentQuestions = useMemo(() => {
    const start = (currentPage - 1) * questionsPerPage
    const end = start + questionsPerPage
    return initialData.questions.slice(start, end)
  }, [currentPage, questionsPerPage, initialData.questions])

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter(a => a.submitted || a.pending).length
  }, [answers])

  const answeredOnPage = useMemo(() => {
    return currentQuestions.filter(q => answers[q.id]?.submitted || answers[q.id]?.pending).length
  }, [currentQuestions, answers])

  const pendingAnswers = useMemo(() => {
    return Object.entries(answers)
      .filter(([_, a]) => a.pending)
      .map(([questionId, a]) => ({ questionId, selectedAnswer: a.selectedAnswer }))
  }, [answers])

  const selectAnswer = useCallback((questionId: string, selectedAnswer: string) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: {
          isCorrect: false,
          correctAnswer: '',
          submitted: true,
          selectedAnswer,
          pending: true
        }
      }
      saveToStorage(updated, currentPage)
      setHasUnsavedChanges(true)
      return updated
    })
  }, [currentPage, saveToStorage])

  const summaryData = useMemo(() => {
    const answered = Object.values(answers).filter(a => a.submitted).length
    const pending = Object.values(answers).filter(a => a.pending).length
    const total = answered + pending
    const correct = Object.values(answers).filter(a => a.submitted && !a.pending && a.isCorrect).length
    const incorrect = Object.values(answers).filter(a => a.submitted && !a.pending && !a.isCorrect).length
    const score = answered > 0 ? Math.round((correct / answered) * 100) : 0
    
    return { total, answered, pending, correct, incorrect, score }
  }, [answers])

  const showAnswerResults = useCallback(async () => {
    setShowAnswersLoading(true)
    try {
      if (pendingAnswers.length > 0) {
        const result = await onSubmitBatch(pendingAnswers)
        
        setAnswers(prev => {
          const updated = { ...prev }
          result.results.forEach(r => {
            if (updated[r.questionId]) {
              updated[r.questionId] = {
                ...updated[r.questionId],
                isCorrect: r.isCorrect,
                correctAnswer: r.correctAnswer,
                pending: false
              }
            }
          })
          saveToStorage(updated, currentPage)
          setHasUnsavedChanges(false)
          return updated
        })
      }
      setShowAnswers(true)
      setShowSummaryModal(true)
    } catch (error) {
      console.error('Failed to submit answers:', error)
    } finally {
      setShowAnswersLoading(false)
    }
  }, [pendingAnswers, onSubmitBatch, currentPage, saveToStorage])

  const toggleExplanations = useCallback(() => {
    setShowExplanations(prev => !prev)
  }, [])

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }, [currentPage, totalPages])

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  const changeQuestionsPerPage = useCallback((value: number) => {
    setQuestionsPerPage(value)
    setCurrentPage(1)
    localStorage.setItem(`quiz_settings_${sessionId}`, JSON.stringify({ questionsPerPage: value }))
  }, [sessionId])

  const submitQuiz = useCallback(async () => {
    setIsSubmitting(true)
    try {
      if (pendingAnswers.length > 0) {
        await onSubmitBatch(pendingAnswers)
      }
      if (onSubmitQuiz) {
        await onSubmitQuiz()
      }
      localStorage.removeItem(storageKey)
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to submit quiz:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }, [pendingAnswers, onSubmitBatch, onSubmitQuiz, storageKey])

  const retakeQuiz = useCallback(() => {
    setAnswers({})
    setCurrentPage(1)
    setShowAnswers(false)
    setShowExplanations(false)
    setShowSummaryModal(false)
    localStorage.removeItem(storageKey)
  }, [storageKey])

  const closeSummaryModal = useCallback(() => {
    setShowSummaryModal(false)
  }, [])

  return {
    answers,
    currentPage,
    totalPages,
    questionsPerPage,
    questionsPerPageOptions: QUESTIONS_PER_PAGE_OPTIONS,
    currentQuestions,
    answeredCount,
    answeredOnPage,
    showAnswers,
    showExplanations,
    showAnswersLoading,
    showSummaryModal,
    summaryData,
    isSubmitting,
    hasUnsavedChanges,
    selectAnswer,
    showAnswerResults,
    toggleExplanations,
    goToPage,
    nextPage,
    previousPage,
    changeQuestionsPerPage,
    submitQuiz,
    retakeQuiz,
    closeSummaryModal
  }
}
