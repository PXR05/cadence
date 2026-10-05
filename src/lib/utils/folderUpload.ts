const AUDIO_EXTENSION = /\.(mp3|opus|wav|flac|m4a|aac|ogg)$/i;

export function getFolderAudioFiles(files: File[]): File[] {
  return files
    .filter((file) => AUDIO_EXTENSION.test(file.name))
    .sort((a, b) =>
      (a.webkitRelativePath || a.name).localeCompare(
        b.webkitRelativePath || b.name,
        undefined,
        { numeric: true, sensitivity: "base" },
      ),
    );
}

export function getFolderName(files: File[]): string {
  return files[0]?.webkitRelativePath?.split("/")[0] || "New Playlist";
}

export function getFolderCoverImage(files: File[]): File | undefined {
  return files
    .filter((file) => /^cover\.(jpg|png)$/i.test(file.name))
    .sort((a, b) => {
      const aPath = a.webkitRelativePath || a.name;
      const bPath = b.webkitRelativePath || b.name;
      return (
        aPath.split("/").length - bPath.split("/").length ||
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()) ||
        aPath.localeCompare(bPath, undefined, { numeric: true, sensitivity: "base" })
      );
    })[0];
}
