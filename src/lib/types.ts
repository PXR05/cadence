interface AudioMetadata {
  title?: string | undefined;
  artist?: string | undefined;
  album?: string | undefined;
  year?: number | undefined;
  genre?: string[] | undefined;
  duration?: number | undefined;
  bitrate?: number | undefined;
  sampleRate?: number | undefined;
  channels?: number | undefined;
  format?: string | undefined;
}

interface AudioFile {
  id: string;
  filename: string;
  size: number;
  uploadedAt: Date;
  metadata?: AudioMetadata | undefined;
  imageFile?: string | undefined;
}

interface AudioListResponse {
  files: AudioFile[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
