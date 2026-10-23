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

## v2: automatic music discovery and listening stories

- Scans the shared Android audio library with permission, with no fixed artist/song limit.
- **Add music folder** grants optional Storage Access Framework access to a directory that may not be indexed by MediaStore; repeat to add multiple folders. Private streams inside other apps remain inaccessible.
- Dynamic album, artist and folder collections appear automatically from actual audio metadata. No songs are deleted or omitted because classification failed; uncertain tracks remain in **Other / Review** and **All Kalaam**.
- Hamd, Naat, Khwaja, Ghaus, Manqabat, Quran, Dua, Qawwali, Ghazal, Nasheed, Marsiya, Bayan and more have localized transliteration/Urdu/Devanagari keyword matching. This is **not** audio-content analysis.
- Listening minutes/daily weekly monthly stats and Memory of the Month are recorded locally with JSON backups.
- Website uses file/folder picker and basic MP3 ID3 tags; browser sandbox cannot read installed apps or music without selection.
- Existing app ID `com.mehfil.auto` and Vercel destination `mehfil-auto.vercel.app` remain unchanged.
- Development APK is debug-signed on CI; GitHub's temporary signing key may change between builds, so Android may require uninstalling the earlier debug APK before installing this one. This clears the app's local data; export a backup first if the installed version supports it.
