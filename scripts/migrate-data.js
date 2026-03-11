const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

const DOCUMENTS_DIR = path.join(process.cwd(), 'data', 'documents')

async function migrate() {
    console.log('Starting migration of JSON files to database...')

    if (!fs.existsSync(DOCUMENTS_DIR)) {
        console.log('No documents directory found. Skipping.')
        return
    }

    const files = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.endsWith('.json'))
    console.log(`Found ${files.length} files to migrate.`)

    for (const file of files) {
        try {
            const filePath = path.join(DOCUMENTS_DIR, file)
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

            const existing = await prisma.document.findUnique({
                where: { id: data.id }
            })

            if (existing) {
                console.log(`Document ${data.id} already exists in DB. Skipping.`)
                continue
            }

            console.log(`Migrating document: ${data.title} (${data.id})...`)

            await prisma.document.create({
                data: {
                    id: data.id,
                    title: data.title,
                    filename: data.filename,
                    filePath: data.filePath,
                    fileType: data.fileType,
                    fileSize: data.fileSize,
                    rawText: data.rawText,
                    status: data.status,
                    totalQuestions: data.totalQuestions,
                    createdAt: new Date(data.createdAt),
                    updatedAt: new Date(data.updatedAt),
                    questions: {
                        create: data.questions.map((q, index) => ({
                            id: q.id,
                            questionNumber: q.questionNumber,
                            questionText: q.questionText,
                            choices: JSON.stringify(q.choices),
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation,
                            orderIndex: index
                        }))
                    }
                }
            })

            console.log(`Successfully migrated ${data.id}`)
        } catch (err) {
            console.error(`Failed to migrate ${file}:`, err.message)
        }
    }

    console.log('Migration completed.')
}

migrate()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect())
