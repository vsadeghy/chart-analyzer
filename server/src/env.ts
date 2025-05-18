import { z, ZodError } from "zod";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
expand(config());

const _env = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  NOBITX_API_KEY: z.string(),
});

export type EnvSchema = z.infer<typeof _env>;

try {
  _env.parse(process.env);
} catch (error) {
  if (error instanceof ZodError) {
    let message = "Missing required values in .env:\n";
    error.issues.forEach((issue) => {
      message += issue.path[0] + "\n";
    });
    const e = new Error(message);
    e.stack = "";
    throw e;
  } else {
    console.error(error);
  }
}

export const env = _env.parse(process.env);
