'use client'

import React, { useState } from 'react';

export default function DocUpload() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<string[]>([]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    setUploading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setMessage(`✅ Uploaded: ${data.fileName}`);
        setFiles(prev => [...prev, data.fileName]);
        form.reset();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch {
      setMessage('❌ Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">Document Upload</h3>
      
      <div className="mb-4">
        <button className="btn-secondary mb-2">
          Connect Google Drive
        </button>
        <p className="text-xs text-slate-500">Sync transcripts, essays, and recommendation letters.</p>
      </div>
      
      <form onSubmit={handleUpload} className="space-y-4">
        <input
          type="file"
          name="file"
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          disabled={uploading}
        />
        <button
          type="submit"
          disabled={uploading}
          className="btn-primary w-full"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </form>
      
      {message && <p className="mt-3 text-sm">{message}</p>}
      
      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Uploaded Files:</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            {files.map((file, i) => (
              <li key={i}>📄 {file}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
