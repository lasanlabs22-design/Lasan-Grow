// Profile photos live in the user_photos table as small data URLs. Pages never embed them: they link
// to /profile-photo/<user id>, and `v` changes with every new photo so browsers can cache each one.
export const photoUrl = (userId, updatedAt) =>
  updatedAt ? `/profile-photo/${userId}?v=${new Date(updatedAt).getTime().toString(36)}` : null;

// About 150 KB of image once base64 is unpacked; the browser crops to 320px and re-encodes well under it.
export const MAX_PHOTO_CHARS = 200_000;
export const PHOTO_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
