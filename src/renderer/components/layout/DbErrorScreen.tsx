import { motion } from 'motion/react';
import { Database, AlertTriangle } from 'lucide-react';

interface Props {
  error: string;
}

export function DbErrorScreen({ error }: Props): JSX.Element {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center px-8"
    >
      <div className="max-w-xl w-full surface p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-lg bg-danger/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-danger" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Database file could not be opened</h1>
            <p className="text-sm text-ink-muted">KillerSudoku stores its data on disk.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-md border border-line bg-bg-surface p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-muted mb-2">
              <Database className="h-3.5 w-3.5" />
              <span>Error</span>
            </div>
            <p className="text-sm text-ink font-mono break-all">{error}</p>
          </div>

          <div className="rounded-md border border-line bg-bg-surface p-4 text-sm text-ink-muted space-y-2">
            <p className="text-ink font-medium">Fix it</p>
            <p>1. Ensure your user can write to the app data directory.</p>
            <p>2. Close any other instance of KillerSudoku that may be holding the file.</p>
            <p>3. Restart KillerSudoku.</p>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
