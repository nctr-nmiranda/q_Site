'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Upload, X, CheckCircle, AlertCircle, Clock, Shuffle, Layers, Save, Database } from 'lucide-react'
import mammoth from 'mammoth'

interface QuizConfig {
  shuffleQuestions: boolean
  shuffleAnswers: boolean
  questionsPerPage: number
  timerEnabled: boolean
  timerMinutes: number | null
}

interface Choice {
  id: string
  text: string
}

interface Question {
  questionNumber: number
  questionText: string
  choices: Choice[]
  correctAnswer: string
  explanation: string | null
}

interface UploadResult {
  id: string
  title: string
  totalQuestions: number
  questions: Question[]
}

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [questionnaireName, setQuestionnaireName] = useState('')
  const [savingQuestionnaire, setSavingQuestionnaire] = useState(false)
  
  const [config, setConfig] = useState<QuizConfig>({
    shuffleQuestions: false,
    shuffleAnswers: true,
    questionsPerPage: 10,
    timerEnabled: false,
    timerMinutes: null
  })

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) validateAndSetFile(droppedFile)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) validateAndSetFile(selectedFile)
  }, [])

  const validateAndSetFile = (selectedFile: File) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Only DOCX files are supported. PDF support coming soon.')
      return
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.')
      return
    }
    
    setError('')
    setFile(selectedFile)
  }

  const removeFile = () => {
    setFile(null)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return
    
    setUploading(true)
    setProgress(10)
    setError('')
    
    try {
      // Extract text client-side using mammoth
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      const extractedText = result.value
      
      if (!extractedText || extractedText.length < 10) {
        setError('Could not extract text from file. Please check the file format.')
        setUploading(false)
        return
      }
      
      setProgress(50)
      
      // Send extracted text to API as JSON
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedText,
          filename: file.name
        })
      })
      
      setProgress(90)
      
      const data = await res.json()
      
      if (data.success) {
        setResult(data.data)
        setQuestionnaireName(data.data.title)
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to process document')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to process file. Please try again.')
    } finally {
      setUploading(false)
      setProgress(100)
    }
  }

  const startQuiz = async () => {
    if (!result) return
    
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: result.id,
          ...config
        })
      })
      const data = await res.json()
      
      if (data.success) {
        router.push(`/quiz/${data.data.sessionId}`)
      } else {
        alert(data.error || 'Failed to start quiz')
      }
    } catch (err) {
      alert('Failed to start quiz')
    }
  }

  const saveQuestionnaire = async () => {
    if (!result || !questionnaireName.trim()) return
    
    setSavingQuestionnaire(true)
    try {
      const res = await fetch('/api/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: questionnaireName.trim(),
          examTitle: result.title,
          questions: result.questions
        })
      })
      const data = await res.json()
      
      if (data.success) {
        setShowSaveModal(false)
        router.push('/questionnaires')
      } else {
        alert(data.error || 'Failed to save questionnaire')
      }
    } catch (err) {
      alert('Failed to save questionnaire')
    } finally {
      setSavingQuestionnaire(false)
    }
  }

  if (success && result) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Upload Successful!</h2>
                <p className="text-slate-600">{result.totalQuestions} questions extracted</p>
              </div>
            </div>
            <p className="text-slate-700 font-medium mb-4">{result.title}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Quiz Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-700">Shuffle Questions</span>
                </div>
                <button
                  onClick={() => setConfig(c => ({ ...c, shuffleQuestions: !c.shuffleQuestions }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    config.shuffleQuestions ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    config.shuffleQuestions ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shuffle className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-700">Shuffle Answers</span>
                </div>
                <button
                  onClick={() => setConfig(c => ({ ...c, shuffleAnswers: !c.shuffleAnswers }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    config.shuffleAnswers ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    config.shuffleAnswers ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-700">Questions per Page</span>
                </div>
                <select
                  value={config.questionsPerPage}
                  onChange={(e) => setConfig(c => ({ ...c, questionsPerPage: Number(e.target.value) }))}
                  className="px-3 py-2 border rounded-lg bg-white text-slate-700"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-700">Timer</span>
                </div>
                <button
                  onClick={() => setConfig(c => ({ 
                    ...c, 
                    timerEnabled: !c.timerEnabled,
                    timerMinutes: !c.timerEnabled ? 30 : null 
                  }))}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    config.timerEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    config.timerEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {config.timerEnabled && (
                <div className="flex items-center justify-between pl-8">
                  <span className="text-slate-600">Timer Duration (minutes)</span>
                  <input
                    type="number"
                    min="1"
                    value={config.timerMinutes || ''}
                    onChange={(e) => setConfig(c => ({ 
                      ...c, 
                      timerMinutes: e.target.value ? Number(e.target.value) : null 
                    }))}
                    className="w-20 px-3 py-2 border rounded-lg bg-white text-slate-700"
                    placeholder="30"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={startQuiz}
                disabled={config.timerEnabled && !config.timerMinutes}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Quiz
              </button>
              <button
                onClick={() => router.push(`/document/${result.id}`)}
                className="px-6 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Preview
              </button>
            </div>

            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowSaveModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <Database className="w-4 h-4" />
                Save Questionnaire for Later
              </button>
            </div>
          </div>
        </div>

        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Save Questionnaire</h3>
              <p className="text-sm text-slate-600 mb-4">
                Save this questionnaire to take the quiz later or edit the questions.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Questionnaire Name</label>
                <input
                  type="text"
                  value={questionnaireName}
                  onChange={(e) => setQuestionnaireName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-slate-700"
                  placeholder="My Exam Reviewer"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveQuestionnaire}
                  disabled={savingQuestionnaire || !questionnaireName.trim()}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingQuestionnaire ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Upload Document</h1>
          <Link href="/questionnaires" className="text-sm text-blue-600 hover:underline">
            My Questionnaires
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
          >
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Drop your file here
              </h3>
              <p className="text-slate-600 mb-4">
                or click to browse
              </p>
              <p className="text-sm text-slate-500">
                Supports DOCX (max 10MB)
              </p>
            </label>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button onClick={removeFile} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {uploading && (
              <div className="mb-6">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2">Processing document... {progress}%</p>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Processing...' : 'Upload & Extract Questions'}
            </button>
          </div>
        )}

        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-2">Supported Format Example:</h3>
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
{`Question: 2
A) 0.0.0.0/0
B) 10.0.0.0/8
C) 172.16.0.0/12
D) 192.168.0.0/16

Answer: B

Explanation:
Option B, 10.0.0.0/8 is correct because...`}
          </pre>
        </div>
      </main>
    </div>
  )
}
