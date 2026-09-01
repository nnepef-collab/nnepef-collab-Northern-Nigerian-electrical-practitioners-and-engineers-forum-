/**
 * SQLite Database Error Analyzer
 * Analyzes local SQLite errors, constraints, and disk write events.
 */

export interface ErrorAnalysis {
  category: 'CONSTRAINT' | 'LOCK' | 'CORRUPTION' | 'IO' | 'AUTH' | 'SCHEMA' | 'GENERAL';
  title: string;
  explanation: string;
  remediation: string;
  isFatal: boolean;
}

export function analyzeSQLiteError(error: any): ErrorAnalysis {
  const message = (error?.message || String(error || '')).toLowerCase();

  if (message.includes('unique') || message.includes('constraint')) {
    return {
      category: 'CONSTRAINT',
      title: 'SQLite Unique Constraint Violation',
      explanation: 'A record with the specified email, phone, or membership ID already exists in the local database.',
      remediation: 'Ensure the unique fields (email, phone, reference) are unique or update the existing row instead.',
      isFatal: false
    };
  }

  if (message.includes('locked') || message.includes('busy')) {
    return {
      category: 'LOCK',
      title: 'SQLite Database Busy / Locked',
      explanation: 'Another local thread or process was writing to the SQLite database simultaneously.',
      remediation: 'Transactions are automatically queued. Retry the operation.',
      isFatal: false
    };
  }

  if (message.includes('disk') || message.includes('enospc') || message.includes('permission')) {
    return {
      category: 'IO',
      title: 'Local Storage I/O Error',
      explanation: 'The system encountered an error writing the SQLite file to local disk storage.',
      remediation: 'Check available storage on the device and verify write permissions for ./data directory.',
      isFatal: true
    };
  }

  return {
    category: 'GENERAL',
    title: 'SQLite Operation Log',
    explanation: error?.message || 'The database executed the requested local query.',
    remediation: 'All operations are tracked in local SQLite audit logs.',
    isFatal: false
  };
}
