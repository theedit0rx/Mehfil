/* Mehfil Auto — offline listening statistics. No analytics network calls. */
(function (root) {
  'use strict';
  const KEY = 'mehfil_listening_history_v2';
  const MAX_SECONDS = 60 * 60 * 24; // safety bound for corrupted input
  const pad = x => String(x).padStart(2, '0');
  function dateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function monthKey(date) { return dateKey(date).slice(0, 7); }
  function weekKey(date) {
    const d = date instanceof Date ? new Date(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return dateKey(d);
  }
  function trackDetails(t) {
    return { title: String(t.title || t.name || 'Untitled').slice(0, 240),
      artist: String(t.artist || 'Unknown artist').slice(0, 160),
      categories: Array.isArray(t.categories) ? t.categories.filter(x => typeof x === 'string').slice(0, 15) : [] };
  }
  function toNum(n) { return Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0; }
  function create(storage) {
    let data;
    try { data = JSON.parse(storage.getItem(KEY) || 'null'); } catch (_) { data = null; }
    if (!data || data.version !== 2 || typeof data.days !== 'object' || !data.days) {
      data = { version: 2, days: {} };
    }
    let dirty = false;
    function flush() {
      if (!dirty) return true;
      try { storage.setItem(KEY, JSON.stringify(data)); dirty = false; return true; }
      catch (e) { return false; }
    }
    function dayFor(key) {
      if (!data.days[key]) data.days[key] = { seconds: 0, plays: 0, tracks: {} };
      return data.days[key];
    }
    function trackFor(day, t) {
      const id = String(t.id || t.uri || t.path || t.title || '').slice(0, 400);
      if (!id) return null;
      const meta = trackDetails(t);
      if (!day.tracks[id]) day.tracks[id] = { ...meta, seconds: 0, plays: 0 };
      else Object.assign(day.tracks[id], meta);
      return day.tracks[id];
    }
    function recordStart(t, timestamp = Date.now()) {
      if (!t || !Number.isFinite(timestamp)) return;
      const d = dayFor(dateKey(timestamp));
      const row = trackFor(d, t);
      if (!row) return;
      d.plays += 1; row.plays += 1; dirty = true; flush();
    }
    function recordSeconds(t, startTimestamp, seconds) {
      if (!t || !Number.isFinite(startTimestamp) || !Number.isFinite(seconds) || seconds <= 0) return;
      let left = Math.min(MAX_SECONDS, seconds), at = startTimestamp;
      while (left > 0.00001) {
        const d = new Date(at);
        const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
        const slice = Math.min(left, (nextMidnight - at) / 1000);
        if (slice <= 0) break;
        const row = dayFor(dateKey(d));
        const tr = trackFor(row, t);
        if (!tr) break;
        row.seconds += slice; tr.seconds += slice;
        at += slice * 1000; left -= slice;
      }
      dirty = true; flush();
    }
    function summarize(filterFn) {
      const res = { seconds: 0, plays: 0, activeDays: 0, tracks: {}, artists: {}, categories: {}, days: {} };
      for (const [day, value] of Object.entries(data.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !filterFn(day)) continue;
        const sec = toNum(value.seconds), plays = toNum(value.plays);
        res.seconds += sec; res.plays += plays; res.days[day] = sec;
        if (sec > 0) res.activeDays++;
        for (const [id, v] of Object.entries(value.tracks || {})) {
          const seconds = toNum(v.seconds), p = toNum(v.plays);
          if (!res.tracks[id]) res.tracks[id] = { ...trackDetails(v), id, seconds: 0, plays: 0 };
          res.tracks[id].seconds += seconds; res.tracks[id].plays += p;
          const artist = v.artist || 'Unknown artist';
          res.artists[artist] = (res.artists[artist] || 0) + seconds;
          for (const cat of (Array.isArray(v.categories) ? v.categories : [])) res.categories[cat] = (res.categories[cat] || 0) + seconds;
        }
      }
      res.topTracks = Object.values(res.tracks).sort((a, b) => b.seconds - a.seconds || b.plays - a.plays);
      res.topArtists = Object.entries(res.artists).sort((a, b) => b[1] - a[1]);
      res.topCategories = Object.entries(res.categories).sort((a, b) => b[1] - a[1]);
      res.topDay = Object.entries(res.days).sort((a, b) => b[1] - a[1])[0] || null;
      return res;
    }
    function day(day) { return summarize(key => key === day); }
    function week(start) { return summarize(key => key >= start && key < dateKey(new Date(new Date(start + 'T12:00:00').getTime() + 7 * 86400000))); }
    function month(yyyyMM) { return summarize(key => key.slice(0, 7) === yyyyMM); }
    function all() { return summarize(() => true); }
    function recentMonths() { return Object.keys(data.days).map(k => k.slice(0, 7)).filter(k => /^\d{4}-\d{2}$/.test(k)).sort().reverse().filter((v,i,a) => a.indexOf(v) === i); }
    function exportData() { flush(); return JSON.parse(JSON.stringify(data)); }
    function importData(input) {
      if (!input || input.version !== 2 || !input.days || typeof input.days !== 'object' || Array.isArray(input.days)) throw new Error('Invalid Mehfil history backup');
      const keys = Object.keys(input.days);
      if (keys.length > 3000) throw new Error('Backup has too many days');
      const cleaned = { version: 2, days: {} };
      for (const key of keys) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
        const d = input.days[key]; if (!d || typeof d !== 'object') continue;
        const row = { seconds: Math.min(MAX_SECONDS, toNum(d.seconds)), plays: Math.min(1000000, toNum(d.plays)), tracks: {} };
        if (Object.keys(d.tracks || {}).length > 10000) throw new Error('Backup has too many tracks');
        for (const [id, t] of Object.entries(d.tracks || {})) {
          if (!t || typeof t !== 'object') continue;
          row.tracks[String(id).slice(0, 400)] = { ...trackDetails(t), seconds: Math.min(MAX_SECONDS, toNum(t.seconds)), plays: Math.min(1000000, toNum(t.plays)) };
        }
        cleaned.days[key] = row;
      }
      data = cleaned; dirty = true; if (!flush()) throw new Error('Unable to save history on this device');
    }
    function clear() { data = { version: 2, days: {} }; dirty = true; flush(); }
    return { recordStart, recordSeconds, day, week, month, all, recentMonths, exportData, importData, clear, flush };
  }
  root.MehfilHistory = { create, dateKey, monthKey, weekKey };
})(typeof window !== 'undefined' ? window : globalThis);
