// A rewatch's ordinal position, in English — "2nd watch", "3rd watch",
// "21st watch". Ordinal 1 (the first-ever viewing) never gets a label at
// all — see the one caller — since a first watch isn't a "rewatch"
// worth quietly noting (see docs/diary.md, "Rewatch presentation").
export function ordinalWatchLabel(ordinal: number): string {
  const mod100 = ordinal % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${ordinal}th watch`;
  switch (ordinal % 10) {
    case 1:
      return `${ordinal}st watch`;
    case 2:
      return `${ordinal}nd watch`;
    case 3:
      return `${ordinal}rd watch`;
    default:
      return `${ordinal}th watch`;
  }
}
