/**
 * Wrapper for async route handlers to catch errors
 * This ensures all async errors are passed to the error handler middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;

