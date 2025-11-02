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
  color?: string | undefined;
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

interface PlaylistItem {
  id: string;
  position: number;
  addedAt: Date;
  audio: AudioFile;
}

interface Playlist {
  id: string;
  name: string;
  userId: string;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
}

interface PlaylistDetail extends Playlist {
  items: PlaylistItem[];
}
