package com.mehfil.auto;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Real Android audio engine: audio lives in a mediaPlayback foreground service,
 * not the WebView/Activity. Android's Media3 session provides system notification,
 * lock-screen, headset and Bluetooth play/pause/skip controls.
 *
 * Swiping the Activity out of Recents does not call stopSelf. A real Force stop
 * or device-specific battery policy can still terminate playback.
 */
public class PlaybackService extends MediaSessionService {
    public static final String ACTION_PLAY_TRACK = "com.mehfil.auto.PLAY_TRACK";
    private static final Object QUEUE_LOCK = new Object();
    private static ArrayList<MediaItem> buildingQueue = new ArrayList<>();
    private static List<MediaItem> libraryQueue = Collections.emptyList();
    private static volatile PlaybackService active;
    private ExoPlayer player;
    private MediaSession mediaSession;
    private boolean serviceReady = false;

    public static void queueBegin() {
        synchronized (QUEUE_LOCK) { buildingQueue = new ArrayList<>(); }
    }
    public static void queueAppend(String json) {
        try {
            JSONArray arr = new JSONArray(json);
            synchronized (QUEUE_LOCK) {
                for (int i = 0; i < arr.length() && buildingQueue.size() < 45000; i++) {
                    JSONObject t = arr.optJSONObject(i);
                    if (t == null) continue;
                    MediaItem item = parseItem(t.optString("uri"),t.optString("id"),t.optString("title"),t.optString("artist"));
                    if (item != null) buildingQueue.add(item);
                }
            }
        } catch (Exception ignored) { }
    }
    public static void queueFinish() {
        synchronized (QUEUE_LOCK) { libraryQueue = new ArrayList<>(buildingQueue); buildingQueue.clear(); }
    }
    private static MediaItem parseItem(String value, String id, String title, String artist) {
        Uri uri;
        try { uri = Uri.parse(value); } catch (Exception e) { return null; }
        if (!"content".equals(uri.getScheme())) return null;
        // Only Android's indexed audio URIs or the user's explicitly granted Documents.
        if (!"media".equals(uri.getAuthority()) && !uri.getAuthority().contains("documents")) return null;
        return new MediaItem.Builder().setUri(uri).setMediaId(id == null || id.isEmpty()?value:id)
                .setMediaMetadata(new MediaMetadata.Builder()
                        .setTitle(title==null||title.isEmpty()?"Untitled":title)
                        .setArtist(artist==null||artist.isEmpty()?"Unknown artist":artist).build()).build();
    }
    @Override public void onCreate() {
        super.onCreate();
        player = new ExoPlayer.Builder(this).build();
        player.setAudioAttributes(new AudioAttributes.Builder()
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).setUsage(C.USAGE_MEDIA).build(), true);
        player.setHandleAudioBecomingNoisy(true);
        player.setRepeatMode(Player.REPEAT_MODE_ALL);
        mediaSession = new MediaSession.Builder(this, player).setId("mehfil-player").build();
        serviceReady = true;
        active = this;
    }
    @Override public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }
    @Override public int onStartCommand(Intent intent,int flags,int startId) {
        if (intent != null && ACTION_PLAY_TRACK.equals(intent.getAction())) {
            String uri = intent.getStringExtra("uri");
            String id = intent.getStringExtra("id");
            String title = intent.getStringExtra("title");
            String artist = intent.getStringExtra("artist");
            MediaItem single = parseItem(uri,id,title,artist);
            if (single != null && serviceReady) {
                List<MediaItem> list;
                synchronized (QUEUE_LOCK) { list = new ArrayList<>(libraryQueue); }
                int index = -1;
                for (int i = 0; i < list.size(); i++) {
                    if (list.get(i).localConfiguration != null
                         && uri.equals(list.get(i).localConfiguration.uri.toString())) { index=i;break; }
                }
                if (index < 0) { list = Collections.singletonList(single); index=0; }
                else list.set(index,single);
                try {
                    player.setMediaItems(list,index,0L);
                    player.prepare();
                    player.play();
                } catch (Exception ignored) {
                    player.clearMediaItems();
                }
            }
            // MediaSessionService promotes itself to foreground as playback begins.
            return START_STICKY;
        }
        return super.onStartCommand(intent,flags,startId);
    }
    public static void setShuffleCurrent(boolean enabled) {
        PlaybackService service=active;
        if(service!=null&&service.player!=null)service.player.setShuffleModeEnabled(enabled);
    }
    public static void setRepeatCurrent(String mode) {
        PlaybackService service=active;
        if(service==null||service.player==null)return;
        int repeat="one".equals(mode)?Player.REPEAT_MODE_ONE:"off".equals(mode)?Player.REPEAT_MODE_OFF:Player.REPEAT_MODE_ALL;
        service.player.setRepeatMode(repeat);
    }
    @Override public void onTaskRemoved(Intent rootIntent) {
        // Keep active playback alive after a normal Recents swipe.
        if(player!=null&&player.isPlaying())return;
        super.onTaskRemoved(rootIntent);
    }
    public static void pauseCurrent() { PlaybackService s=active;if(s!=null&&s.player!=null)s.player.pause(); }
    public static void resumeCurrent() { PlaybackService s=active;if(s!=null&&s.player!=null)s.player.play(); }
    public static void seekCurrent(long ms) { PlaybackService s=active;if(s!=null&&s.player!=null)s.player.seekTo(Math.max(0,ms)); }
    public static String snapshot() {
        PlaybackService s=active;
        JSONObject obj=new JSONObject();
        try {
            if (s!=null && s.player!=null && s.player.getCurrentMediaItem()!=null) {
                MediaItem t=s.player.getCurrentMediaItem();
                obj.put("id",t.mediaId);
                obj.put("uri",t.localConfiguration==null?"":t.localConfiguration.uri.toString());
                obj.put("title",t.mediaMetadata.title==null?"":t.mediaMetadata.title.toString());
                obj.put("artist",t.mediaMetadata.artist==null?"":t.mediaMetadata.artist.toString());
                obj.put("position",Math.max(0,s.player.getCurrentPosition()));
                obj.put("duration",Math.max(0,s.player.getDuration()));
                obj.put("playing",s.player.isPlaying());obj.put("shuffle",s.player.getShuffleModeEnabled());obj.put("repeat",s.player.getRepeatMode());
                obj.put("ended",s.player.getPlaybackState()==Player.STATE_ENDED);
            }
        } catch (Exception ignored) { }
        return obj.toString();
    }
    @Override public void onDestroy() {
        active=null;
        if (mediaSession != null) { mediaSession.release();mediaSession=null; }
        if (player!=null){player.release();player=null;}
        super.onDestroy();
    }
}
