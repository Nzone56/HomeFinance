import { z } from "zod";

import { content } from "@/content/es";

export const signInSchema = z.object({
  email: z.email({ error: content.validation.emailInvalid }),
  password: z.string().min(1, { error: content.validation.passwordRequired }),
});

export type SignInInput = z.infer<typeof signInSchema>;
