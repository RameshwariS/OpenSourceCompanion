import { ApiError } from '../utils/ApiError.js';

/**
 * Validates body/query/params against a zod schema shaped like
 * z.object({ body?, query?, params? }). Results land in req.validated.
 *
 * Why req.validated and not req.body: in Express 5 `req.query` is read-only,
 * so one consistent place is simpler. Zod also STRIPS unknown fields, which
 * means a client can't sneak in `role: "admin"` (mass assignment).
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body ?? {},
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.slice(1).join('.'),
      message: issue.message,
    }));
    return next(new ApiError(400, errors[0].message, { errors }));
  }

  req.validated = result.data;
  next();
};