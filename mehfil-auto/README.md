# MEHFIL Auto

A private, offline-first Android music player + companion web/PWA. Music is categorized from **file and song metadata**, not audio understanding. The browser edition requires choosing audio files or a folder, because browser privacy rules do not allow unrestricted access to all local audio. The native Android app uses `READ_MEDIA_AUDIO` (Android 13+) or `READ_EXTERNAL_STORAGE` (Android 12 and below), queries `MediaStore`, and plays `content://media` songs through `MediaPlayer`.

## Features
- Audio access requested on first native launch, automatic scan on opening and return.
- 11 overlapping playlists: Allah/Hamd, Nabi/Naat, Khwaja, Data/Ghaus, Ali/Qalandar, Ahl-e-Bait, Qawwali/Sufi, Ghazal, Nusrat Fateh Ali Khan, Aziz Mian, Sabri Brothers.
- Favorites and manual genre corrections in local storage.
- Search, queue controls, seek, local file playback. No network requests, server music upload, analytics or account.
- Modern Android WebView app with native playback; responsive installable web app for browser-based imports.

## Build APK
From `android/` with Android SDK & Gradle 8.10.2 and JDK 17: `gradle assembleDebug`. Output `android/app/build/outputs/apk/debug/app-debug.apk`. Source code and a GitHub Actions workflow are included, with publication of a debug-signed APK as a GitHub Release.

## Limitations
- Classification is keyword based; some songs may be unsorted or wrong. Manually correct them with Edit.
- Artist metadata depends on the phone's MediaStore records. No automatic transcript processing.
- Debug builds are for personal testing and are not production-signed.
- Android file updates are rescanned when app reopens. Playlists stay local to the same installation; a cloud sync between website and APK is not included.

## Listening Story (v1.1)
- Real listening time credited from observed media-position progress, bounded by elapsed real time; scrubbing and pauses do not count.
- Local daily records for the last seven days, eight weekly charts (Monday to Sunday), and a 12-month overview.
- Memory of the Month reports the most listened recording, top artist and collection, busiest listening day, listening days, songs started and total hours. Previous months remain available.
- Device-local listening history persists in browser localStorage / the native Android WebView storage. No online activity tracking or audio uploads.
- Export and restore JSON backups, including listening history, favorites and custom category edits. Android uses the system document picker; browser downloads JSON.
- If WebView is suspended, listening time is recovered from the media position when it resumes, but a force-close or system kill may omit the final unflushed seconds. On-device and browser stats are separate unless you transfer a backup.
- v1.1 is a debug-signed testing APK. Android APK debug signing keys from GitHub Actions may differ between builds, so direct installation over v1 can fail. Uninstalling an older version removes its local library preferences. A consistently signed production release is needed for seamless future upgrades.
