package com.mehfil.auto;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.content.ContentUris;
import android.database.Cursor;
import android.media.MediaMetadataRetriever;
import android.provider.DocumentsContract;
import android.content.UriPermission;
import java.util.Set;
import java.util.HashSet;
import java.util.ArrayDeque;
import java.util.Locale;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import android.webkit.WebResourceRequest;
import android.content.Intent;
import android.graphics.Color;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

public class MainActivity extends Activity {
  private WebView web;
  private final ExecutorService worker = Executors.newSingleThreadExecutor();
  private boolean ready = false;
  private boolean completed = false;
  private ValueCallback<Uri[]> fileCallback;
  private String pendingBackup;
  private static final int FILE_PICKER = 113;
  private static final int EXPORT_BACKUP = 114;
  private static final int AUDIO_REQUEST = 111;
  private static final int FOLDER_PICKER = 115;
  private static final String PREFS = "mehfil_library_folders";
  private String requestedPermission(){return Build.VERSION.SDK_INT >= 33 ? Manifest.permission.READ_MEDIA_AUDIO : Manifest.permission.READ_EXTERNAL_STORAGE;}
  private boolean hasAudioPermission(){return checkSelfPermission(requestedPermission()) == PackageManager.PERMISSION_GRANTED;}
  private void send(String method, String arg){runOnUiThread(()-> {if(web!=null && ready) web.evaluateJavascript("window.Mehfil."+method+"("+JSONObject.quote(arg)+")",null);});}
  @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(Color.rgb(16,19,15));getWindow().setNavigationBarColor(Color.rgb(16,19,15));
    web=new WebView(this);web.setBackgroundColor(Color.rgb(16,19,15));WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(true);settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
    web.addJavascriptInterface(new Bridge(),"AndroidBridge");
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
        if(fileCallback!=null)fileCallback.onReceiveValue(null);
        fileCallback=callback;
        try { Intent chooser=params.createIntent();chooser.setType("application/json");startActivityForResult(chooser,FILE_PICKER);return true; }
        catch(Exception e){fileCallback.onReceiveValue(null);fileCallback=null;return false;}
      }
    });
    web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !request.getUrl().toString().equals("file:///android_asset/index.html");}@Override public void onPageFinished(WebView v,String url){ready=true;send("onServiceState",PlaybackService.snapshot());}});setContentView(web);web.loadUrl("file:///android_asset/index.html");
  }
  private boolean acceptedAudio(String name, String mime){
    if (mime != null && mime.startsWith("audio/")) return true;
    return name != null && name.toLowerCase(Locale.ROOT).matches(".*\\.(mp3|flac|wav|m4a|aac|ogg|opus|wma|alac|amr)$");
  }
  private void scanSavedFolder(JSONArray songs, Set<String> known, Uri tree, int max){
    try {
      final String rootDoc = DocumentsContract.getTreeDocumentId(tree);
      final ArrayDeque<String[]> pending = new ArrayDeque<>();pending.add(new String[]{rootDoc,"Selected folder"});
      int limit=0;
      while(!pending.isEmpty() && limit < max){
        final String[] current=pending.removeFirst();
        Uri folderUri = DocumentsContract.buildChildDocumentsUriUsingTree(tree,current[0]);
        try(Cursor cursor=getContentResolver().query(folderUri,new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME,DocumentsContract.Document.COLUMN_MIME_TYPE},null,null,null)){
          if(cursor==null)continue;
          while(cursor.moveToNext() && limit < max){
            String id=cursor.getString(0),name=cursor.getString(1),mime=cursor.getString(2);
            if(DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)){
              if(pending.size()<4000)pending.addLast(new String[]{id,current[1]+"/"+name});
              continue;
            }
            if(!acceptedAudio(name,mime))continue;
            Uri uri=DocumentsContract.buildDocumentUriUsingTree(tree,id);
            String stable="saf:"+uri.toString();if(!known.add(stable))continue;
            JSONObject song = new JSONObject();song.put("id",stable);song.put("uri",uri.toString());song.put("name",name);
            song.put("title",name.replaceFirst("\\.[^.]+$",""));song.put("artist","Unknown artist");song.put("album","");song.put("duration",0);
            song.put("path",current[1]+"/"+name);
            // MediaMetadataRetriever reads headers, NOT entire audio files.
            MediaMetadataRetriever meta=new MediaMetadataRetriever();
            try{meta.setDataSource(MainActivity.this,uri);
              String title=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE),artist=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST),album=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM),len=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
              if(title!=null&&!title.isEmpty())song.put("title",title);if(artist!=null&&!artist.isEmpty())song.put("artist",artist);
              if(album!=null&&!album.isEmpty())song.put("album",album);
              if(len!=null)try{song.put("duration",Long.parseLong(len)/1000);}catch(NumberFormatException ignored){}
            }catch(Exception ignored){}finally{try{meta.release();}catch(Exception ignored){}}
            songs.put(song);limit++;
          }
        }
      }
    }catch(Exception e){send("onScanNotice","A selected folder could not be read: "+e.getMessage());}
  }
  private void scan(){worker.execute(()->{JSONArray songs=new JSONArray();Set<String> known=new HashSet<>();
    String[] cols;
    if(Build.VERSION.SDK_INT>=29)cols=new String[]{MediaStore.Audio.Media._ID,MediaStore.Audio.Media.DISPLAY_NAME,MediaStore.Audio.Media.TITLE,MediaStore.Audio.Media.ARTIST,MediaStore.Audio.Media.ALBUM,MediaStore.Audio.Media.DURATION,MediaStore.Audio.Media.RELATIVE_PATH};
    else cols=new String[]{MediaStore.Audio.Media._ID,MediaStore.Audio.Media.DISPLAY_NAME,MediaStore.Audio.Media.TITLE,MediaStore.Audio.Media.ARTIST,MediaStore.Audio.Media.ALBUM,MediaStore.Audio.Media.DURATION,MediaStore.Audio.Media.DATA};
    try(Cursor c=getContentResolver().query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,cols,null,null,MediaStore.Audio.Media.TITLE+" COLLATE NOCASE ASC")){
      if(c!=null){while(c.moveToNext()){
        long id=c.getLong(0);JSONObject j=new JSONObject();Uri uri=ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,id);
        String display=c.getString(1);j.put("id",uri.toString());j.put("uri",uri.toString());j.put("name",display);
        j.put("title",c.getString(2));j.put("artist",c.getString(3));j.put("album",c.getString(4));j.put("duration",c.getLong(5)/1000L);
        String path=c.getString(6);j.put("path",(path==null?"":path)+"/"+display);songs.put(j);known.add(uri.toString());
      }}
    }catch(Exception e){send("onScanNotice","Music scan issue: "+e.getMessage());}
    Set<String> folders=getPreferences(MODE_PRIVATE).getStringSet(PREFS,new HashSet<String>());
    for(String folder:folders){try{scanSavedFolder(songs,known,Uri.parse(folder),20000);}catch(Exception ignored){}}
    send("beginScan","");
    for(int i=0;i<songs.length();i+=400){JSONArray part=new JSONArray();for(int k=i;k<Math.min(songs.length(),i+400);k++){try{part.put(songs.get(k));}catch(Exception ignored){}}
      send("receiveChunk",part.toString());}
    send("endScan","");
  });}
  private void chooseFolder(){runOnUiThread(()->{try{
    Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
    startActivityForResult(i,FOLDER_PICKER);
  }catch(Exception e){send("onScanNotice","No folder picker was available.");}});}
  private void requestAndScan(){runOnUiThread(()->{if(hasAudioPermission())scan();else requestPermissions(new String[]{requestedPermission()},AUDIO_REQUEST);});}
  @Override public void onRequestPermissionsResult(int req,String[] permissions,int[] grants){super.onRequestPermissionsResult(req,permissions,grants);if(req==AUDIO_REQUEST){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)scan();else send("onPermissionDenied","");}}
  @Override protected void onActivityResult(int requestCode,int resultCode,Intent result){
    super.onActivityResult(requestCode,resultCode,result);
    if(requestCode==FOLDER_PICKER){
      if(resultCode==RESULT_OK&&result!=null&&result.getData()!=null){
        Uri tree=result.getData();try{
          getContentResolver().takePersistableUriPermission(tree,Intent.FLAG_GRANT_READ_URI_PERMISSION);
          Set<String> previous=getPreferences(MODE_PRIVATE).getStringSet(PREFS,new HashSet<String>());
          Set<String> updated=new HashSet<>(previous);updated.add(tree.toString());
          getPreferences(MODE_PRIVATE).edit().putStringSet(PREFS,updated).apply();
          send("onScanNotice","Extra music folder added. Scanning all accessible songs again…");scan();
        }catch(Exception ex){send("onScanNotice","Unable to read that folder: "+ex.getMessage());}
      }
      return;
    }
    if(requestCode==FILE_PICKER){
      if(fileCallback!=null){Uri[] resultUris=resultCode==RESULT_OK&&result!=null&&result.getData()!=null?new Uri[]{result.getData()}:null;fileCallback.onReceiveValue(resultUris);fileCallback=null;}
      return;
    }
    if(requestCode==EXPORT_BACKUP){
      if(resultCode==RESULT_OK&&result!=null&&result.getData()!=null&&pendingBackup!=null){
        try(OutputStream out=getContentResolver().openOutputStream(result.getData())){
          if(out!=null){out.write(pendingBackup.getBytes(StandardCharsets.UTF_8));out.flush();send("onBackupSaved","Backup saved successfully.");}
        }catch(Exception ex){send("onBackupSaved","Backup failed: "+ex.getMessage());}
      }
      pendingBackup=null;
    }
  }
  private void exportBackup(String content,String filename){runOnUiThread(()->{
    if(content==null||content.length()>5000000){send("onBackupSaved","Backup is too large.");return;}
    pendingBackup=content;
    Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);
    i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,filename==null?"Mehfil-Listening.json":filename.replaceAll("[^a-zA-Z0-9_.-]","_"));
    try{startActivityForResult(i,EXPORT_BACKUP);}catch(Exception e){pendingBackup=null;send("onBackupSaved","No document picker was found.");}
  });}
  @Override protected void onResume(){super.onResume();if(ready){send("onServiceState",PlaybackService.snapshot());if(hasAudioPermission())scan();}}
  @Override protected void onDestroy(){worker.shutdownNow();if(web!=null)web.destroy();super.onDestroy();}
  // UI forwards playback selection to a separate, long-lived foreground media service.
  private void play(String value,String title,String artist,String id){runOnUiThread(()->{
    try {
      Uri uri=Uri.parse(value);
      if(!"content".equals(uri.getScheme()))throw new IllegalArgumentException("Only approved local audio can play");
      if(!"media".equals(uri.getAuthority())&&!DocumentsContract.isDocumentUri(this,uri))throw new IllegalArgumentException("Select the music folder first");
      Intent i=new Intent(this,PlaybackService.class);
      i.setAction(PlaybackService.ACTION_PLAY_TRACK);
      i.putExtra("uri",value);i.putExtra("title",title);i.putExtra("artist",artist);i.putExtra("id",id);
      if(Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);
      // Media3 reports state through the snapshot bridge/Android system session.
      send("onPlaying",value);
    } catch(Exception ex){send("onPlayerError",ex.getMessage());}
  });}
  public class Bridge {
    @JavascriptInterface public void requestAndScan(){MainActivity.this.requestAndScan();}
    @JavascriptInterface public void chooseFolder(){MainActivity.this.chooseFolder();}
    @JavascriptInterface public void queueBegin(){PlaybackService.queueBegin();}
    @JavascriptInterface public void queueAppend(String batch){PlaybackService.queueAppend(batch);}
    @JavascriptInterface public void queueFinish(){PlaybackService.queueFinish();}
    @JavascriptInterface public void play(String uri,String title,String artist,String id){MainActivity.this.play(uri,title,artist,id);}
    @JavascriptInterface public void setShuffle(boolean enabled){runOnUiThread(()->PlaybackService.setShuffleCurrent(enabled));}
    @JavascriptInterface public void setRepeat(String mode){runOnUiThread(()->PlaybackService.setRepeatCurrent(mode));}
    @JavascriptInterface public void pause(){runOnUiThread(PlaybackService::pauseCurrent);}
    @JavascriptInterface public void resume(){runOnUiThread(PlaybackService::resumeCurrent);}
    @JavascriptInterface public void seek(int position){runOnUiThread(()->PlaybackService.seekCurrent(position));}
    @JavascriptInterface public void exportBackup(String content,String filename){MainActivity.this.exportBackup(content,filename);}
    @JavascriptInterface public String position(){return PlaybackService.snapshot();}
  }
}
