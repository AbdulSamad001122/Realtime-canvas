import { useEffect, useState } from 'react';

export function ConsoleLogger() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Store the original console methods
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    // Override console methods to capture logs
    console.log = function(...args) {
      originalConsole.log.apply(console, args);
      setLogs(prev => [...prev, `LOG: ${args.map(arg => JSON.stringify(arg)).join(' ')}`]);
    };

    console.error = function(...args) {
      originalConsole.error.apply(console, args);
      setLogs(prev => [...prev, `ERROR: ${args.map(arg => JSON.stringify(arg)).join(' ')}`]);
    };

    console.warn = function(...args) {
      originalConsole.warn.apply(console, args);
      setLogs(prev => [...prev, `WARN: ${args.map(arg => JSON.stringify(arg)).join(' ')}`]);
    };

    console.info = function(...args) {
      originalConsole.info.apply(console, args);
      setLogs(prev => [...prev, `INFO: ${args.map(arg => JSON.stringify(arg)).join(' ')}`]);
    };

    // Restore original console methods on cleanup
    return () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 text-white p-2 max-h-40 overflow-auto z-50">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-bold">Console Logs</h3>
        <button 
          className="text-xs bg-red-500 px-2 py-1 rounded"
          onClick={() => setLogs([])}
        >
          Clear
        </button>
      </div>
      <div className="text-xs font-mono">
        {logs.slice(-50).map((log, i) => (
          <div key={i} className="mb-1">{log}</div>
        ))}
      </div>
    </div>
  );
}
