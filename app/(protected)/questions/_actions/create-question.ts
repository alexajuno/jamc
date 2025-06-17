"use server"

import { prisma } from "@/lib/db/prisma"
import { enhance } from "@zenstackhq/runtime"
import { auth } from "@/auth"
import { userWithRolesInclude } from "@/lib/types/prisma"
import { slugify } from "@/lib/utils"
import { QuestionType, Visibility } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { notifyNewCourseQuestion } from "@/lib/services/notification-triggers"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { Buffer } from "buffer"

// Use FormData to support file uploads for attachments

/**
 * Create a new question
 * 
 * This function uses ZenStack's enhance() directly with user context
 * to enforce access policies for creation operations
 */
export async function createQuestion(formData: FormData) {
  try {
    const session = await auth()
    
    // Must be authenticated to create a question
    if (!session?.user?.email) {
      throw new Error("You must be signed in to create a question")
    }
    
    // Get user with roles for proper authorization
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email
      },
      include: userWithRolesInclude
    })
    
    if (!user) {
      throw new Error("User not found")
    }
    
    // Create enhanced client with user context for this specific operation
    // This applies ZenStack's access policies for the current user
    const enhancedPrisma = enhance(prisma, { user })
    
    const title = formData.get('title')?.toString() || ''
    const content = formData.get('content')?.toString() || ''
    const type = formData.get('type')?.toString() as QuestionType
    const visibility = formData.get('visibility')?.toString() as Visibility
    const topic = formData.get('topic')?.toString() || undefined
    const tags = formData.getAll('tags') as string[]
    const courseId = formData.get('courseId')?.toString() || undefined
    const lessonId = formData.get('lessonId')?.toString() || undefined
    const attachments = formData.getAll('attachments') as File[]

    // Generate slug from title
    const slug = slugify(title)
    
    // Resolve tags: connect existing & create new to avoid update policy
    // Find tags that already exist
    const existingTags = await prisma.tag.findMany({
      where: { name: { in: tags } },
      select: { id: true, name: true }
    })
    const existingNames = existingTags.map(t => t.name)
    // Determine which tags are new
    const newTagNames = tags.filter(name => !existingNames.includes(name))
    // If user attempts to create new tags, block and inform them
    if (newTagNames.length > 0) {
      throw new Error(
        `You do not have permission to create new tags: ${newTagNames.join(", ")}. Please use existing tags instead.`
      )
    }
    
    // Use the enhanced client to create the question according to access policies
    const question = await enhancedPrisma.question.create({
      data: {
        title,
        content,
        type,
        visibility,
        topic,
        slug,
        author: { connect: { id: user.id } },
        // Connect existing tags only
        tags: {
          connect: existingTags.map(t => ({ id: t.id })),
        },
        ...(courseId ? { course: { connect: { id: courseId } } } : {}),
        ...(lessonId ? { lesson: { connect: { id: lessonId } } } : {}),
      }
    })

    if (attachments.length > 0) {
      const bucket = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      if (!bucket || !region) {
        throw new Error("S3 bucket or region is not configured. Please contact support.");
      }
      const s3 = new S3Client({ region });
      const failedUploads: string[] = [];
      for (const file of attachments) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          // Sanitize file name: remove special chars, spaces, etc.
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const key = `questions/${question.id}/${Date.now()}-${safeName}`;
          await s3.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: buffer,
              ContentType: file.type,
              ContentLength: buffer.length,
            })
          );
          const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
          await enhancedPrisma.attachment.create({
            data: { url, type: file.type, questionId: question.id }
          });
        } catch (err) {
          console.error(`Failed to upload attachment: ${file.name}`, err);
          failedUploads.push(file.name);
        }
      }
      if (failedUploads.length > 0) {
        return {
          success: false,
          error: `Some attachments failed to upload: ${failedUploads.join(", ")}`
        };
      }
    }
    
    // Send notification if this is a course question
    if (courseId) {
      try {
        await notifyNewCourseQuestion(question.id, user.id)
      } catch (error) {
        console.error('Failed to send new course question notification:', error)
        // Don't fail the question creation if notification fails
      }
    }
    
    // Revalidate the questions page
    revalidatePath('/questions')
    
    return { success: true, questionId: question.id, slug: question.slug }
  } catch (error) {
    console.error("Error creating question:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    }
  }
} 