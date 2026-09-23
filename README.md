# MEHFIL

**Har Kalaam, Ek Mehfil.**

A private, local-first spiritual music library for authorized Qawwali, Sufi, Ghazal, Hamd, Naat and Manqabat collections.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The project is a Vite SPA and can be deployed to Vercel as-is (Build Command: `npm run build`, Output Directory: `dist`).

## What is included

- Responsive premium MEHFIL experience with desktop sidebar / queue and mobile bottom navigation.
- Persistent local audio player, mini player, full-screen now playing view, media-session handlers, playback speed, seek, repeat, shuffle, volume and smart queue.
- Local-first IndexedDB library, local audio Blob storage, favorites, ratings, notes, history, settings and custom playlists.
- JSON / CSV paste or file metadata importer, local audio / folder importer, duplicate detection, duplicate handling, automatic tag inference and multi-part performance grouping.
- Artist collections that only populate from imported metadata; Nusrat Fateh Ali Khan, Aziz Mian and Sabri Brothers are presented as empty spotlights until matching metadata is imported.
- Multi-membership special mehfils, including Khwaja, Madina, Ali, Ahl-e-Bait, Ghous-e-Azam, Chishti, Manqabat, Hamd, Naat, Qawwali, Ghazal, Deep Mehfil and Late Night Mehfil.
- Lyrics editor with Urdu / Hindi / Hinglish data architecture, Urdu RTL presentation and an authorized-lyrics-only policy.
- JSON export/restore for library metadata, settings, ratings, notes and playlists. Local audio is intentionally excluded from exports for safety and privacy.
- PWA manifest and service worker for offline application shell and locally stored metadata/audio where browser storage permits.

## Master catalog & audio matching

- `src/data/mehfilLibrary.ts` seeds the full MEHFIL master catalog (213 structured entries) covering Nusrat Fateh Ali Khan, Aziz Mian, Farid Ayaz & Abu Muhammad (Tasawwuf), the Sabri tradition, Ustad Jaffar Hussain, other library tracks, and the special theme priorities. Every entry carries type, language, themes, version (Live / Remix / Classical / Part 1 / Part 2) and an audio status.
- Audio statuses: `ONLINE_AVAILABLE` (authorized online source linked), `LOCAL_FILE` (your attached file, offline-ready), `MATCH_REQUIRED` ("Audio file required" — the default; nothing is fabricated), and `UNAVAILABLE` (skipped by you).
- `/admin/matching` (also under Library Manager → Audio matching) lists every catalog title with match status, suggested source file, confidence, and actions: Accept match, Find another, Upload My Audio, Edit, Skip / restore.
- "Add My Music" (Import wizard → Match to catalog) scans a chosen folder, reads embedded ID3 tags (title / artist / album / small artwork where present), matches filenames & tags against the catalog, and offers one Attach action per title. Attached files are stored locally in IndexedDB and become offline-playable through the PWA.
- The catalog migrates safely: existing local libraries are preserved and missing catalog entries are added on upgrade (seedVersion-gated).

## Rights note

MEHFIL does not include, stream, scrape, download or fabricate copyrighted music or lyrics. The only included audio is a short original interface test tone (`public/audio/mehfil-demo.wav`) clearly marked as such. Import audio you personally own or are authorized to use.
