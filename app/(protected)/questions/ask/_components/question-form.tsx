"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { TagFilter } from "../../components/tag-filter";
import { createQuestion } from "../../_actions/create-question";
import { getMyCoursesWithLessons } from "@/app/(protected)/courses/_actions/course-actions";
import { Input } from "@/components/ui/input";
import { AttachmentUpload } from "./AttachmentUpload";
import { AttachmentGallery } from "./AttachmentGallery";
import { QuestionType, Visibility } from "@prisma/client";
import { QuestionContext } from "@/lib/types/question";
import { toast } from "sonner";
import PostingGuideline from "./posting-guideline";
import SimilarQuestion from "./similar-question";
import { QuestionFormFields } from "../../_components/QuestionFormFields";
import { Tag, ExistingQuestion } from "../_actions/ask-data";

// Define the form schema with zod
const questionSchema = z.object({
  title: z
    .string()
    .min(10, { message: "Title must be at least 10 characters" })
    .max(150, { message: "Title must be less than 150 characters" }),
  content: z
    .string()
    .min(20, { message: "Description must be at least 20 characters" }),
  type: z.nativeEnum(QuestionType, {
    errorMap: () => ({ message: "Please select a question type" }),
  }),
  visibility: z.nativeEnum(Visibility, {
    errorMap: () => ({ message: "Please select visibility" }),
  }),
  topic: z.string().optional(),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

interface QuestionFormProps {
  tags: Tag[];
  context: QuestionContext;
  existingQuestions: ExistingQuestion[];
}

// Shape of courses returned by getMyCoursesWithLessons
interface EnrolledCourse {
  id: string;
  title: string;
  slug: string;
  lessons: {
    id: string;
    title: string;
    slug: string;
    order: number;
  }[];
}

export function QuestionForm({
  tags,
  context,
  existingQuestions,
}: QuestionFormProps) {
  void tags;
  const [localContext, setLocalContext] = useState<QuestionContext>(context);
  const [allQuestions] = useState<ExistingQuestion[]>(existingQuestions);
  const router = useRouter();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [similarQuestions, setSimilarQuestions] = useState<ExistingQuestion[]>(
    []
  );
  const [isSimilarityLoading, setIsSimilarityLoading] = useState(false);
  const [similarityError, setSimilarityError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      title: "",
      content: "",
      type: QuestionType.FORMAL,
      visibility: Visibility.PUBLIC,
    },
  });

  // Handle title changes to fetch similarity-based suggestions
  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    // propagate to react-hook-form
    register("title").onChange(e);
    if (title.length > 10) {
      setIsSimilarityLoading(true);
      setSimilarityError(null);
      try {
        // Compute similarity with each existing question
        const scored = await Promise.all(
          allQuestions.map(async (q) => {
            const res = await fetch("/api/similarity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sentence1: title, sentence2: q.title }),
            });
            if (!res.ok) throw new Error("Similarity API error");
            const { similarity } = await res.json();
            return { ...q, similarity };
          })
        );
        // sort by descending similarity and pick top 5
        const top = scored
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5);
        setSimilarQuestions(top);
      } catch (err) {
        console.error(err);
        setSimilarityError("Failed to fetch similar questions");
        setSimilarQuestions([]);
      } finally {
        setIsSimilarityLoading(false);
      }
    } else {
      setSimilarQuestions([]);
      setSimilarityError(null);
    }
  };

  const contentValue = watch("content"); // raw Markdown/LaTeX text
  const selectedTypeValue = watch("type");

  const onSubmit = async (data: QuestionFormValues) => {
    if (selectedTags.length === 0) {
      toast.error("Please select at least one tag");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('type', data.type);
      formData.append('visibility', data.visibility);
      if (data.type === 'FORMAL' && data.topic) {
        formData.append('topic', data.topic);
      }
      selectedTags.forEach(t => formData.append('tags', t));
      if (localContext.courseId) formData.append('courseId', localContext.courseId);
      if (localContext.lessonId) formData.append('lessonId', localContext.lessonId);
      attachments.forEach(file => formData.append('attachments', file));

      const result = await createQuestion(formData);

      if (result.success) {
        toast.success("Question posted successfully!");
        // Redirect to the new question page
        router.push(`/questions/${result.questionId}/${result.slug}`);
      } else {
        toast.error(result.error || "Failed to post question");
      }
    } catch (error) {
      console.error("Error posting question:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch courses the user is enrolled in or authored on mount
  useEffect(() => {
    setLoadingCourses(true);
    getMyCoursesWithLessons()
      .then(setCourses)
      .catch((err: Error) => setCoursesError(err.message))
      .finally(() => setLoadingCourses(false));
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <QuestionFormFields
            register={register}
            errors={errors}
            contentValue={contentValue}
            isSubmitting={isSubmitting}
            showPreviewToggle={false}
            onTitleChange={handleTitleChange}
          />

          <div className="space-y-2">
            <Label>Tags</Label>
          <TagFilter
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
          {selectedTags.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Select at least one tag to categorize your question
            </p>
          )}
        </div>

        {selectedTypeValue === QuestionType.FORMAL && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input id="topic" {...register("topic")} disabled={isSubmitting} />
            </div>
            <AttachmentUpload onFilesSelected={setAttachments} />
            <AttachmentGallery files={attachments} onRemove={(f) => setAttachments(attachments.filter(a => a !== f))} />
          </div>
        )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Question Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={QuestionType.FORMAL}>
                        Formal
                      </SelectItem>
                      <SelectItem value={QuestionType.YOLO}>YOLO</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-destructive">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Visibility.PUBLIC}>Public</SelectItem>
                      <SelectItem value={Visibility.PRIVATE}>
                        Private
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.visibility && (
                <p className="text-sm text-destructive">
                  {errors.visibility.message}
                </p>
              )}
            </div>
          </div>

          {/* Course / Lesson selection */}
          <div className="space-y-2">
            <Label>Course (Optional)</Label>
            {loadingCourses ? (
              <Loader2 className="animate-spin" />
            ) : coursesError ? (
              <p className="text-sm text-destructive">{coursesError}</p>
            ) : (
              <Select
                value={localContext.courseId || ""}
                onValueChange={(value) => {
                  // Only reset lessonId if user is manually changing course (not on initial load)
                  if (value !== context.courseId) {
                    setLocalContext({ courseId: value, lessonId: undefined });
                  } else {
                    setLocalContext({ courseId: value, lessonId: localContext.lessonId });
                  }
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {localContext.courseId && (
            <div className="space-y-2">
              <Label>Lesson (Optional)</Label>
              <Select
                value={localContext.lessonId || ""}
                onValueChange={(value) =>
                  setLocalContext((ctx) => ({ ...ctx, lessonId: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lesson" />
                </SelectTrigger>
                <SelectContent>
                  {courses
                    .find((c) => c.id === localContext.courseId)
                    ?.lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting Question...
              </>
            ) : (
              "Post Question"
            )}
          </Button>
        </form>
      </div>

      <div>
        {/* Similarity suggestions */}
        {isSimilarityLoading && <Loader2 className="animate-spin" />}
        {similarityError && (
          <p className="text-sm text-destructive">{similarityError}</p>
        )}
        {similarQuestions.length > 0 && (
          <SimilarQuestion similarQuestions={similarQuestions} />
        )}

        <PostingGuideline />
      </div>
    </div>
  );
}
