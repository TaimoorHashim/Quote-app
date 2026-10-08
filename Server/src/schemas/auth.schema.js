import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(255);

export const registerSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(150),
  name: z.string().trim().min(2, "Your name is required").max(100),
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer")
    .regex(/[A-Za-z]/, "Password needs at least one letter")
    .regex(/[0-9]/, "Password needs at least one number"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(72),
});