## 2024-05-23 - Decorative Team Logos
**Learning:** Team logos rendered adjacent to team names cause redundant screen reader announcements (e.g., "Real Madrid, image, Real Madrid") when the image has alt text.
**Action:** Ensure decorative team avatars or logos placed next to visible team names have `alt=""` and `aria-hidden="true"` to improve screen reader experience.
