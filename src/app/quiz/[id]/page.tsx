'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuiz, QuizData } from '@/hooks/useQuiz'
import { QuizHeader, QuizFooter, QuestionCard, SummaryModal } from '@/components/quiz'
import { Button } from '@/components/ui'

export default function QuizPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initQuiz = async () => {
      const id = params.id as string

      try {
        const res = await fetch('/api/quiz/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        })
        const data = await res.json()

        if (!data.success) {
          setError(data.error || 'Quiz not found')
          setLoading(false)
          setIsReady(true)
          return
        }

        if (data.data.type === 'session' && data.data.sessionId !== id) {
          router.replace(`/quiz/${data.data.sessionId}`)
          return
        }

        if (data.data.type === 'completed') {
          router.push(`/results/${id}`)
          return
        }

        const sessionRes = await fetch(`/api/quiz/${id}`)
        const sessionData = await sessionRes.json()

        if (!sessionData.success) {
          setError('Failed to load quiz')
          setLoading(false)
          setIsReady(true)
          return
        }

        const session = sessionData.data

        setQuizData({
          sessionId: session.sessionId,
          documentTitle: session.documentTitle,
          totalQuestions: session.totalQuestions,
          questionsPerPage: session.questionsPerPage,
          questions: session.questions
        })

      } catch (err) {
        setError('Failed to load quiz')
        console.error(err)
      } finally {
        setLoading(false)
        setIsReady(true)
      }
    }

    initQuiz()
  }, [params.id, router])

  const handleSubmitBatch = async (answers: { questionId: string; selectedAnswer: string }[]) => {
    const res = await fetch(`/api/quiz/${quizData!.sessionId}/answer/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to submit answers')
    }
    return data.data
  }

  const handleSubmitQuiz = async () => {
    const res = await fetch(`/api/quiz/${quizData!.sessionId}`, {
      method: 'POST'
    })
    const data = await res.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to complete quiz')
    }
    router.push(`/results/${quizData!.sessionId}`)
  }

  const handleExit = () => {
    if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
      router.push('/upload')
    }
  }

  const quizState = useQuiz({
    sessionId: quizData?.sessionId || '',
    initialData: quizData || { sessionId: '', documentTitle: '', totalQuestions: 0, questionsPerPage: 10, questions: [] },
    onSubmitBatch: handleSubmitBatch,
    onSubmitQuiz: handleSubmitQuiz
  })

  if (loading || !isReady || !quizData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Quiz</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/upload')}>
            Back to Upload
          </Button>
        </div>
      </div>
    )
  }

  const {
    answers,
    currentPage,
    totalPages,
    questionsPerPage,
    currentQuestions,
    answeredCount,
    answeredOnPage,
    showAnswers,
    showExplanations,
    showAnswersLoading,
    showSummaryModal,
    summaryData,
    isSubmitting,
    selectAnswer,
    showAnswerResults,
    toggleExplanations,
    goToPage,
    nextPage,
    previousPage,
    submitQuiz,
    retakeQuiz,
    closeSummaryModal
  } = quizState

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <QuizHeader
        currentPage={currentPage}
        totalPages={totalPages}
        currentQuestion={answeredCount}
        totalQuestions={quizData.totalQuestions}
        questionsPerPage={questionsPerPage}
        answeredCount={answeredCount}
        showAnswers={showAnswers}
        showExplanations={showExplanations}
        showAnswersLoading={showAnswersLoading}
        onToggleAnswers={showAnswerResults}
        onToggleExplanations={toggleExplanations}
        onExit={handleExit}
      />

      <main className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {currentQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              answer={answers[question.id]}
              showAnswer={showAnswers}
              showExplanation={showExplanations}
              onSelectAnswer={(answerId) => selectAnswer(question.id, answerId)}
            />
          ))}
        </div>
      </main>

      <QuizFooter
        currentPage={currentPage}
        totalPages={totalPages}
        answeredOnPage={answeredOnPage}
        totalOnPage={currentQuestions.length}
        onPreviousPage={previousPage}
        onNextPage={nextPage}
        onJumpToPage={goToPage}
        onSubmit={submitQuiz}
        isSubmitting={isSubmitting}
      />

      <SummaryModal
        isOpen={showSummaryModal}
        onClose={closeSummaryModal}
        summaryData={summaryData}
        showRevealed={showAnswers}
        onRetake={retakeQuiz}
        onSubmit={submitQuiz}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
