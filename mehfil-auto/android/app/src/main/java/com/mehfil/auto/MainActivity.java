package com.mehfil.auto;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.content.ContentUris;
import android.database.Cursor;
import android.media.MediaPlayer;
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
  private MediaPlayer player;
  private final ExecutorService worker = Executors.newSingleThreadExecutor();
  private boolean ready = false;
  private boolean completed = false;
  private ValueCallback<Uri[]> fileCallback;
  private String pendingBackup;
  private static final int FILE_PICKER = 113;
  private static final int EXPORT_BACKUP = 114;
  private static final int AUDIO_REQUEST = 111;
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
    web.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !request.getUrl().toString().equals("file:///android_asset/index.html");}@Override public void onPageFinished(WebView v,String url){ready=true;}});setContentView(web);web.loadUrl("file:///android_asset/index.html");
  }
  private void scan(){worker.execute(()->{JSONArray songs=new JSONArray();String[] columns={MediaStore.Audio.Media._ID,MediaStore.Audio.Media.DISPLAY_NAME,MediaStore.Audio.Media.TITLE,MediaStore.Audio.Media.ARTIST,MediaStore.Audio.Media.ALBUM,MediaStore.Audio.Media.DURATION,MediaStore.Audio.Media.DATA};
    try(Cursor c=getContentResolver().query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,columns,null,null,MediaStore.Audio.Media.TITLE+" COLLATE NOCASE ASC")){
      if(c!=null){int count=0;while(c.moveToNext()&&count<30000){long id=c.getLong(0);JSONObject j=new JSONObject();Uri songUri=ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,id);j.put("id",id);j.put("uri",songUri.toString());j.put("name",c.getString(1));j.put("title",c.getString(2));j.put("artist",c.getString(3));j.put("album",c.getString(4));j.put("duration",c.getLong(5)/1000L);j.put("path",c.getString(6));songs.put(j);count++;}}
    }catch(Exception e){send("onPlayerError","Music scan failed: "+e.getMessage());}
    send("receiveSongs",songs.toString());
  });}
  private void requestAndScan(){runOnUiThread(()->{if(hasAudioPermission())scan();else requestPermissions(new String[]{requestedPermission()},AUDIO_REQUEST);});}
  @Override public void onRequestPermissionsResult(int req,String[] permissions,int[] grants){super.onRequestPermissionsResult(req,permissions,grants);if(req==AUDIO_REQUEST){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)scan();else send("onPermissionDenied","");}}
  @Override protected void onActivityResult(int requestCode,int resultCode,Intent result){
    super.onActivityResult(requestCode,resultCode,result);
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
  @Override protected void onResume(){super.onResume();if(ready&&hasAudioPermission())scan();}
  @Override protected void onDestroy(){if(player!=null){player.release();player=null;}worker.shutdownNow();if(web!=null)web.destroy();super.onDestroy();}
  private void play(String value){runOnUiThread(()->{try{Uri uri=Uri.parse(value);if(!"content".equals(uri.getScheme())||!"media".equals(uri.getAuthority()))throw new IllegalArgumentException("Unsupported audio source");if(player!=null){player.release();player=null;}player=new MediaPlayer();completed=false;player.setDataSource(MainActivity.this,uri);player.setOnCompletionListener(mp->completed=true);player.prepare();player.start();send("onPlaying",value);}catch(Exception ex){send("onPlayerError",ex.getMessage());}});}
  public class Bridge {
    @JavascriptInterface public void requestAndScan(){MainActivity.this.requestAndScan();}
    @JavascriptInterface public void play(String uri){MainActivity.this.play(uri);}
    @JavascriptInterface public void pause(){runOnUiThread(()->{if(player!=null&&player.isPlaying())player.pause();});}
    @JavascriptInterface public void resume(){runOnUiThread(()->{if(player!=null&&!player.isPlaying()){completed=false;player.start();}});}
    @JavascriptInterface public void seek(int position){runOnUiThread(()->{if(player!=null){completed=false;player.seekTo(position);}});}
    @JavascriptInterface public void exportBackup(String content,String filename){MainActivity.this.exportBackup(content,filename);}
    @JavascriptInterface public String position(){JSONObject o=new JSONObject();try{if(player!=null){o.put("position",player.getCurrentPosition());o.put("duration",player.getDuration());o.put("playing",player.isPlaying());o.put("ended",completed);}}catch(Exception ignored){}return o.toString();}
  }
}
