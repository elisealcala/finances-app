import { z } from "zod";

export const attachmentKindSchema = z.enum(["RECEIPT", "ANALYSIS", "OTHER"]);

export const medicationInputSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
});

export const listAppointmentsSchema = z
  .object({
    from: z.date().optional(),
    to: z.date().optional(),
  })
  .optional();

export const getAppointmentByIdSchema = z.object({
  id: z.string(),
});

export const createAppointmentSchema = z.object({
  date: z.date(),
  specialty: z.string().min(1),
  doctorName: z.string().optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
  medications: z.array(medicationInputSchema).optional(),
});

export const updateAppointmentSchema = z.object({
  id: z.string(),
  date: z.date().optional(),
  specialty: z.string().min(1).optional(),
  doctorName: z.string().optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const deleteAppointmentSchema = z.object({
  id: z.string(),
});

export const addMedicationSchema = z.object({
  appointmentId: z.string(),
  name: z.string().min(1),
  dosage: z.string().optional().nullable(),
  frequency: z.string().optional().nullable(),
});

export const deleteMedicationSchema = z.object({
  id: z.string(),
});

export const createAttachmentSchema = z.object({
  appointmentId: z.string().optional().nullable(),
  url: z.string().url(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative().optional(),
  kind: attachmentKindSchema.default("OTHER"),
});

export const deleteAttachmentSchema = z.object({
  id: z.string(),
});
