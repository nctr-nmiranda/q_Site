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
  correctAnswers: Record<string, string>
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
  const [questionsCache, setQuestionsCache] = useState<Record<number, Question[]>>({})
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [showExplanations, setShowExplanations] = useState(false)
  const [showAnswersLoading, setShowAnswersLoading] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const totalPages = Math.ceil(initialData.totalQuestions / questionsPerPage)
  const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`

  // Fetch questions for a specific page
  const fetchPage = useCallback(async (page: number) => {
    if (questionsCache[page]) return questionsCache[page]

    try {
      const res = await fetch(`/api/quiz/${sessionId}/questions?page=${page}&limit=${questionsPerPage}`)
      const data = await res.json()
      if (data.success) {
        setQuestionsCache(prev => ({ ...prev, [page]: data.data }))
        return data.data
      }
    } catch (err) {
      console.error(`Failed to fetch page ${page}:`, err)
    }
    return []
  }, [sessionId, questionsPerPage, questionsCache])

  // Load current page questions
  useEffect(() => {
    const loadCurrentPage = async () => {
      if (!questionsCache[currentPage]) {
        setIsLoadingPage(true)
        await fetchPage(currentPage)
        setIsLoadingPage(false)
      }
    }
    loadCurrentPage()
  }, [currentPage, fetchPage, questionsCache])

  // Background prefetch the next page
  useEffect(() => {
    if (currentPage < totalPages && !questionsCache[currentPage + 1]) {
      // Small delay to prioritize current page rendering
      const timer = setTimeout(() => {
        fetchPage(currentPage + 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [currentPage, totalPages, fetchPage, questionsCache])

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.answers) setAnswers(parsed.answers)
        if (parsed.currentPage) setCurrentPage(parsed.currentPage)
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
        if (parsed.questionsPerPage) setQuestionsPerPage(parsed.questionsPerPage)
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

  const saveToStorage = useCallback((newAnswers: Record<string, Answer>, page: number) => {
    localStorage.setItem(storageKey, JSON.stringify({
      answers: newAnswers,
      currentPage: page
    }))
  }, [storageKey])

  const currentQuestions = questionsCache[currentPage] || []

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
    const correctAnswer = initialData.correctAnswers[questionId]
    const isCorrect = selectedAnswer === correctAnswer

    setAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: {
          isCorrect,
          correctAnswer,
          submitted: true,
          selectedAnswer,
          pending: true
        }
      }
      saveToStorage(updated, currentPage)
      setHasUnsavedChanges(true)
      return updated
    })
  }, [currentPage, saveToStorage, initialData.correctAnswers])

  const summaryData = useMemo(() => {
    const answered = Object.values(answers).length
    const total = initialData.totalQuestions
    const correct = Object.entries(answers).filter(([qid, a]) => a.selectedAnswer === initialData.correctAnswers[qid]).length
    const score = answered > 0 ? Math.round((correct / answered) * 100) : 0

    return {
      total,
      answered,
      correct,
      incorrect: answered - correct,
      score,
      pending: 0
    }
  }, [answers, initialData.totalQuestions, initialData.correctAnswers])

  const questionStatus = useMemo(() => {
    return Object.keys(initialData.correctAnswers).map(qid => {
      const answer = answers[qid]
      return {
        qid,
        answered: !!answer,
        correct: answer ? answer.selectedAnswer === initialData.correctAnswers[qid] : null
      }
    })
  }, [answers, initialData.correctAnswers])

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
    setQuestionsCache({}) // Invalidate cache when limit changes
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
    setQuestionsCache({})
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
    isLoadingPage,
    selectAnswer,
    showAnswerResults,
    toggleExplanations,
    goToPage,
    nextPage,
    previousPage,
    changeQuestionsPerPage,
    submitQuiz,
    retakeQuiz,
    closeSummaryModal,
    questionStatus
  }
}
