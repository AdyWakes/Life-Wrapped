import { useRef, useState } from 'react';

interface Props {
  onFiles: (files: File[]) => void;
}

/** Drag-and-drop + tap-to-pick. No `accept` filter: iOS greys out .zip/.txt files with some accept values. */
export function DropZone({ onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  // Folder picking only exists on desktop browsers.
  const [desktop] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches);

  const handle = (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      className={`relative rounded-3xl border-2 border-dashed p-6 text-center transition sm:p-8 ${
        over ? 'border-white bg-white/15' : 'border-white/30 bg-white/5 hover:bg-white/10'
      }`}
    >
      <button type="button" onClick={() => input.current?.click()} className="block w-full">
        <div className="text-4xl" aria-hidden>
          📦
        </div>
        <div className="mt-3 font-display text-xl font-extrabold sm:text-2xl">Drop your exports here</div>
        <div className="mt-1 text-sm text-white/70">
          or <span className="underline">tap to choose files</span> — WhatsApp .txt / .zip, Instagram .zip (JSON). Several at once is fine.
        </div>
      </button>
      {desktop && (
        <button type="button" onClick={() => folder.current?.click()} className="mt-3 text-xs text-white/50 underline">
          Already unzipped your Instagram export? Pick the folder
        </button>
      )}
      <input ref={input} type="file" multiple hidden onChange={(e) => handle(e.target.files)} data-testid="file-input" />
      <input
        ref={folder}
        type="file"
        hidden
        onChange={(e) => handle(e.target.files)}
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
      />
    </div>
  );
}
