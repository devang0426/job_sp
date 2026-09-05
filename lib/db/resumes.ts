import { prisma } from "@/lib/db";
import { ParseSource, Resume } from "@prisma/client";

export interface CreateResumeParams {
  userId: string;
  label?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount?: number | null;
  rawText: string;
  charCount: number;
  parseSource: ParseSource;
}

export async function getActiveResumeId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeResumeId: true },
  });
  if (user?.activeResumeId) {
    return user.activeResumeId;
  }
  const latest = await prisma.resume.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (latest) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeResumeId: latest.id },
    }).catch(() => {});
    return latest.id;
  }
  return null;
}

export async function getResumes(userId: string) {
  const [resumes, user] = await Promise.all([
    prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeResumeId: true },
    }),
  ]);

  return {
    resumes,
    activeResumeId: user?.activeResumeId || null,
  };
}

export async function createResume(params: CreateResumeParams): Promise<Resume> {
  const resume = await prisma.resume.create({
    data: {
      userId: params.userId,
      label: params.label || params.fileName.replace(/\.pdf$/i, "") || "CV",
      fileName: params.fileName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      pageCount: params.pageCount ?? null,
      rawText: params.rawText,
      charCount: params.charCount,
      parseSource: params.parseSource,
    },
  });

  // Uploading a new resume sets it as the active resume
  await prisma.user.update({
    where: { id: params.userId },
    data: { activeResumeId: resume.id },
  }).catch((err) => {
    console.error("Failed to set activeResumeId on user:", err);
  });

  return resume;
}


export async function deleteResume(userId: string, resumeId: string) {
  const [resume, count, user] = await Promise.all([
    prisma.resume.findFirst({
      where: { id: resumeId, userId },
    }),
    prisma.resume.count({
      where: { userId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { activeResumeId: true },
    }),
  ]);

  if (!resume) {
    return { error: "NOT_FOUND" as const };
  }

  const isActive = user?.activeResumeId === resumeId;

  // Deleting the active resume is blocked when it is the only one.
  if (isActive && count === 1) {
    return { error: "SOLE_ACTIVE_RESUME_BLOCKED" as const };
  }

  await prisma.$transaction(async (tx) => {
    if (isActive && count > 1) {
      // Reassign active resume to next latest resume
      const nextResume = await tx.resume.findFirst({
        where: { userId, id: { not: resumeId } },
        orderBy: { createdAt: "desc" },
      });

      if (nextResume) {
        await tx.user.update({
          where: { id: userId },
          data: { activeResumeId: nextResume.id },
        });
      }
    }

    await tx.resume.delete({
      where: { id: resumeId },
    });
  });

  return { success: true };
}

export async function setActiveResume(userId: string, resumeId: string) {
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
  });

  if (!resume) {
    return { error: "NOT_FOUND" as const };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeResumeId: resumeId },
  });

  return { success: true, activeResumeId: resumeId };
}
