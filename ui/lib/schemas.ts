import { z } from "zod";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
} from "@/lib/storage";

export const CreateDocumentSchema = z.object({
  title: z.string().min(1, "Title is required."),
  slug: z.string().min(1).optional(),
  bodyMd: z.string().min(1, "Body is required."),
});

export const UpdateDocumentSchema = CreateDocumentSchema.partial().extend({
  isPublic: z.boolean().optional(),
});

export const ImportDocumentSchema = z.object({
  file: z
    .custom<File>(
      (value): value is File =>
        typeof File !== "undefined" && value instanceof File,
      "Please provide a .md file.",
    )
    .refine(
      (file) => file.name?.toLowerCase().endsWith(".md"),
      "Only markdown files (.md) are supported.",
    ),
  title: z.string().min(1).optional(),
});

export const ImportMultipleDocumentsSchema = z.object({
  files: z
    .array(
      z.custom<File>(
        (value): value is File =>
          typeof File !== "undefined" && value instanceof File,
        "Please provide .md files.",
      )
    )
    .min(1, "At least one file is required.")
    .refine(
      (files) => files.every((file) => file.name?.toLowerCase().endsWith(".md")),
      "Only markdown files (.md) are supported.",
    ),
  slugs: z.array(z.string()).optional(),
  replace: z.array(z.boolean()).optional(),
});

export const UploadSchema = z.object({
  file: z
    .custom<File>(
      (value): value is File =>
        typeof File !== "undefined" && value instanceof File,
      "Please provide a valid file.",
    )
    .superRefine((file, ctx) => {
      if (file.size > MAX_IMAGE_FILE_SIZE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File must be 5MB or less.",
        });
      }
      if (!ALLOWED_IMAGE_MIME_TYPES[file.type]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported file type ${file.type}.`,
        });
      }
    }),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>;
export type ImportDocumentInput = z.infer<typeof ImportDocumentSchema>;
export type ImportMultipleDocumentsInput = z.infer<typeof ImportMultipleDocumentsSchema>;
