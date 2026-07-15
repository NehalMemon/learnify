





const requestLogger = (req, res, next) => {
  // Start the stopwatch
  const start = Date.now();

  // Listen for the 'finish' event (which fires right after res.send() or res.json() finishes)
  res.on('finish', () => {
    // Stop the stopwatch
    const duration = Date.now() - start;
    
    // Grab the status code to colorize or format the log
    const status = res.statusCode;
    
    // Log it to the terminal
    console.log(`[${req.method}] ${req.originalUrl} | Status: ${status} | Time: ${duration}ms`);
  });

  // Pass control to the actual API route
  next();
};

module.exports = requestLogger;