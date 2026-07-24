/** Build a media:// URL for an absolute file path. Shared by main + preload. */
export function toMediaUrl(absPath: string): string {
  return `media://local/${Buffer.from(absPath, 'utf8').toString('base64url')}`
}
