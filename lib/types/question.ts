import { Prisma } from "@prisma/client"

// Question context types
export type QuestionContext = {
  courseId?: string
  lessonId?: string
}

export type QuestionContextBreadcrumb = {
  id: string
  title: string
  type: 'course' | 'lesson' 
  slug: string
}

// Question form data type
export type QuestionFormData = {
  title: string
  content: string
  type: 'YOLO' | 'FORMAL'
  visibility: 'PUBLIC' | 'PRIVATE'
  topic?: string
  context: QuestionContext
  tags: string[]
}

// Question includes for fetching
export const questionWithRelationsInclude = {
  author: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
  course: {
    select: {
      id: true,
      title: true,
      slug: true,
    },
  },
  lesson: {
    select: {
      id: true,
      title: true,
      slug: true,
    },
  },
  tags: {
    select: {
      id: true,
      name: true,
    },
  },
  attachments: {
    select: {
      id: true,
      url: true,
      type: true,
    },
  },
  answers: {
    select: {
      id: true,
      content: true,
      createdAt: true,
      isAcceptedByUser: true,
      isAcceptedByTeacher: true,
      author: {
        select: {
          name: true,
          image: true,
        },
      },
      votes: {
        select: {
          value: true,
        },
      },
      _count: {
        select: {
          votes: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  },
  votes: {
    select: {
      value: true,
    },
  },
  _count: {
    select: {
      answers: true,
      votes: true,
    },
  },
} satisfies Prisma.QuestionInclude

// Question type with all relations
export type QuestionWithRelations = Prisma.QuestionGetPayload<{
  include: typeof questionWithRelationsInclude
}>

// A lightweight type for sidebar related questions
export type RelatedQuestion = Pick<QuestionWithRelations, 'id' | 'title' | 'content' | 'slug'> 