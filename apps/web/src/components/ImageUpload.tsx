'use client';

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { theme } from '@/styles/theme';

interface ImageUploadProps {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
}

export default function ImageUpload({ currentUrl, onUpload }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Get presigned URL
      const presignRes = await fetch('/admin/shows/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
        }),
      });

      if (!presignRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { upload_url, public_url } = await presignRes.json();

      // Upload to S3
      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image');
      }

      setPreview(public_url);
      onUpload(public_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? theme.colors.primary : theme.colors.border}`,
          borderRadius: '8px',
          padding: preview ? '0.5rem' : '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? `${theme.colors.primary}10` : theme.colors.background,
          transition: 'all 0.2s',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        {uploading ? (
          <span style={{ color: theme.colors.primary, fontSize: '0.875rem' }}>Uploading...</span>
        ) : preview ? (
          <div style={{ position: 'relative' }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                maxWidth: '200px',
                maxHeight: '150px',
                borderRadius: '6px',
                objectFit: 'cover',
              }}
            />
            <div style={{
              fontSize: '0.75rem',
              color: theme.colors.textMuted,
              marginTop: '0.5rem',
            }}>
              Click or drag to replace
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '2rem', color: theme.colors.textMuted }}>+</div>
            <div style={{ color: theme.colors.textMuted, fontSize: '0.875rem' }}>
              Drag and drop an image, or click to browse
            </div>
            <div style={{ color: theme.colors.textMuted, fontSize: '0.75rem' }}>
              Max 10MB, JPG/PNG/WebP
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {error && (
        <div style={{
          color: theme.colors.danger,
          fontSize: '0.8125rem',
          marginTop: '0.5rem',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
