import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { quizCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sessionId } = await params
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')

        const cacheKey = `quiz_q_${sessionId}_p${page}_l${limit}`
        const cachedQuestions = quizCache.get<any[]>(cacheKey)

        if (cachedQuestions) {
            return NextResponse.json({
                success: true,
                data: cachedQuestions,
                cached: true
            })
        }

        const questions = await storage.getQuestionsPaginated(sessionId, page, limit)

        // Only cache if we got results
        if (questions.length > 0) {
            quizCache.set(cacheKey, questions)
        }

        return NextResponse.json({
            success: true,
            data: questions
        })
    } catch (error) {
        console.error('Error fetching quiz questions:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch quiz questions'
        }, { status: 500 })
    }
}
