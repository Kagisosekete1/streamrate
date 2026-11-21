package com.semogrouptech.streamrateapp;

import android.graphics.Color;
import android.net.Uri;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import java.io.File;
import java.io.FileOutputStream;

import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.ui.PlayerView;
import androidx.coordinatorlayout.widget.CoordinatorLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeReelPlayer")
public class NativeReelPlayerPlugin extends Plugin {
  private ExoPlayer player;
  private FrameLayout playerLayer;
  private PlayerView playerView;
  private String activeUrl;
  private File previewFile;
  private FileOutputStream previewOutput;

  private void ensurePlayer() {
    if (player != null) return;
    DefaultLoadControl loadControl = new DefaultLoadControl.Builder()
        .setBufferDurationsMs(750, 5000, 150, 350)
        .setPrioritizeTimeOverSizeThresholds(true)
        .build();
    player = new ExoPlayer.Builder(getContext())
        .setLoadControl(loadControl)
        .build();
    player.setPreloadConfiguration(new ExoPlayer.PreloadConfiguration(2_000_000L));
    player.setVolume(1f);
    player.addListener(new Player.Listener() {
      @Override
      public void onPlaybackStateChanged(int playbackState) {
        JSObject state = new JSObject();
        state.put("state", playbackState == Player.STATE_READY ? "ready"
            : playbackState == Player.STATE_BUFFERING ? "buffering"
            : playbackState == Player.STATE_ENDED ? "ended" : "idle");
        state.put("isPlaying", player != null && player.isPlaying());
        notifyListeners("playbackState", state);
      }

      @Override
      public void onPlayerError(androidx.media3.common.PlaybackException error) {
        JSObject state = new JSObject();
        state.put("state", "error");
        state.put("message", error.getMessage() == null ? "Playback failed" : error.getMessage());
        notifyListeners("playbackState", state);
      }
    });
  }

  private void ensurePlayerLayer() {
    if (playerLayer != null && playerLayer.getParent() != null) return;
    View webView = getBridge().getWebView();
    if (!(webView.getParent() instanceof ViewGroup)) return;
    ViewGroup parent = (ViewGroup) webView.getParent();
    playerLayer = new FrameLayout(getContext());
    playerLayer.setBackgroundColor(Color.BLACK);
    playerLayer.setClickable(false);
    playerLayer.setFocusable(false);
    playerView = (PlayerView) getActivity().getLayoutInflater()
        .inflate(R.layout.native_reel_player, playerLayer, false);
    playerView.setPlayer(player);
    playerLayer.addView(playerView, new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    int webViewIndex = parent.indexOfChild(webView);
    CoordinatorLayout.LayoutParams initialParams = new CoordinatorLayout.LayoutParams(1, 1);
    parent.addView(playerLayer, Math.max(0, webViewIndex), initialParams);
    playerLayer.setVisibility(View.GONE);
  }

  @PluginMethod
  public void show(PluginCall call) {
    String url = call.getString("url");
    String nextUrl = call.getString("nextUrl");
    if (url == null || url.trim().isEmpty()) {
      call.reject("A reel video URL is required");
      return;
    }
    getActivity().runOnUiThread(() -> {
      ensurePlayer();
      ensurePlayerLayer();
      if (player == null || playerLayer == null) {
        call.reject("Unable to initialize the native reel player");
        return;
      }
      playerLayer.setVisibility(View.VISIBLE);
      playerView.setPlayer(player);
      if (!url.equals(activeUrl)) {
        int currentIndex = player.getCurrentMediaItemIndex();
        boolean queuedClipIsNext = player.getMediaItemCount() > currentIndex + 1
            && url.equals(player.getMediaItemAt(currentIndex + 1).localConfiguration.uri.toString());
        if (queuedClipIsNext) {
          // The next clip has already been prepared in ExoPlayer's playlist:
          // advance immediately, discard the previous clip, then queue ahead.
          player.seekToNextMediaItem();
          player.removeMediaItem(0);
          if (player.getMediaItemCount() > 1) player.removeMediaItem(1);
          if (nextUrl != null && !nextUrl.trim().isEmpty() && !nextUrl.equals(url)) {
            player.addMediaItem(MediaItem.fromUri(nextUrl));
          }
        } else {
          java.util.ArrayList<MediaItem> items = new java.util.ArrayList<>();
          items.add(MediaItem.fromUri(url));
          if (nextUrl != null && !nextUrl.trim().isEmpty() && !nextUrl.equals(url)) {
            items.add(MediaItem.fromUri(nextUrl));
          }
          player.setMediaItems(items, true);
          player.prepare();
        }
        activeUrl = url;
      }
      player.setRepeatMode(Player.REPEAT_MODE_ONE);
      player.setPlayWhenReady(true);
      player.play();
      call.resolve();
    });
  }

  @PluginMethod
  public void beginLocalPreview(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      try {
        if (previewOutput != null) previewOutput.close();
        if (previewFile != null && previewFile.exists()) previewFile.delete();
        previewFile = File.createTempFile("zyiro-reel-preview-", ".mp4", getContext().getCacheDir());
        previewOutput = new FileOutputStream(previewFile, false);
        call.resolve();
      } catch (Exception error) { call.reject("Unable to create native reel preview", error); }
    });
  }

  @PluginMethod
  public void appendLocalPreviewChunk(PluginCall call) {
    String encoded = call.getString("base64");
    if (encoded == null || encoded.isEmpty()) { call.resolve(); return; }
    getActivity().runOnUiThread(() -> {
      try {
        if (previewOutput == null) throw new IllegalStateException("Preview file is not open");
        previewOutput.write(Base64.decode(encoded, Base64.DEFAULT));
        call.resolve();
      } catch (Exception error) { call.reject("Unable to write reel preview", error); }
    });
  }

  @PluginMethod
  public void finishLocalPreview(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      try {
        if (previewOutput != null) { previewOutput.flush(); previewOutput.close(); previewOutput = null; }
        if (previewFile == null || !previewFile.exists() || previewFile.length() == 0) throw new IllegalStateException("Preview video is empty");
        ensurePlayer();
        ensurePlayerLayer();
        if (player == null || playerLayer == null) throw new IllegalStateException("Native player is unavailable");
        activeUrl = previewFile.toURI().toString();
        playerLayer.setVisibility(View.GONE);
        playerView.setPlayer(player);
        player.setMediaItem(MediaItem.fromUri(Uri.fromFile(previewFile)));
        player.prepare();
        player.setPlayWhenReady(true);
        player.play();
        call.resolve();
      } catch (Exception error) { call.reject("Unable to start native reel preview", error); }
    });
  }

  @PluginMethod
  public void showLocalPreview(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      if (player == null || playerLayer == null || previewFile == null) {
        call.reject("Native preview is not ready");
        return;
      }
      playerLayer.setVisibility(View.VISIBLE);
      player.setPlayWhenReady(true);
      player.play();
      call.resolve();
    });
  }

  @PluginMethod
  public void clearLocalPreview(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      try {
        if (previewOutput != null) { previewOutput.close(); previewOutput = null; }
        if (player != null && previewFile != null && previewFile.toURI().toString().equals(activeUrl)) {
          player.stop(); player.clearMediaItems(); activeUrl = null;
        }
        if (previewFile != null && previewFile.exists()) previewFile.delete();
        previewFile = null;
        if (playerLayer != null) playerLayer.setVisibility(View.GONE);
        call.resolve();
      } catch (Exception error) { call.reject("Unable to clear reel preview", error); }
    });
  }

  @PluginMethod
  public void setBounds(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      ensurePlayer();
      ensurePlayerLayer();
      if (playerLayer == null) {
        call.reject("Unable to position the native reel player");
        return;
      }
      // getBoundingClientRect() already returns CSS pixels after WebView's
      // page scale. Convert CSS px to Android px using density only; applying
      // WebView.getScale() here a second time makes the native video crop/zoom.
      double density = getContext().getResources().getDisplayMetrics().density;
      int left = (int) Math.round(call.getDouble("left", 0d) * density);
      int top = (int) Math.round(call.getDouble("top", 0d) * density);
      int width = Math.max(1, (int) Math.round(call.getDouble("width", 1d) * density));
      int height = Math.max(1, (int) Math.round(call.getDouble("height", 1d) * density));
      View webView = getBridge().getWebView();
      ViewGroup parent = (ViewGroup) playerLayer.getParent();
      CoordinatorLayout.LayoutParams params = new CoordinatorLayout.LayoutParams(width, height);
      params.leftMargin = webView.getLeft() + left;
      params.topMargin = webView.getTop() + top;
      playerLayer.setLayoutParams(params);
      call.resolve();
    });
  }

  @PluginMethod
  public void setMuted(PluginCall call) {
    boolean muted = call.getBoolean("muted", false);
    getActivity().runOnUiThread(() -> {
      if (player != null) player.setVolume(muted ? 0f : 1f);
      call.resolve();
    });
  }

  @PluginMethod
  public void play(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      if (player != null) {
        player.setPlayWhenReady(true);
        player.play();
      }
      call.resolve();
    });
  }

  @PluginMethod
  public void pause(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      if (player != null) player.pause();
      call.resolve();
    });
  }

  @PluginMethod
  public void getState(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      JSObject state = new JSObject();
      state.put("position", player == null ? 0 : player.getCurrentPosition());
      state.put("duration", player == null || player.getDuration() < 0 ? 0 : player.getDuration());
      state.put("isPlaying", player != null && player.isPlaying());
      call.resolve(state);
    });
  }

  @PluginMethod
  public void hide(PluginCall call) {
    getActivity().runOnUiThread(() -> {
      if (player != null) player.pause();
      if (playerLayer != null) playerLayer.setVisibility(View.GONE);
      call.resolve();
    });
  }

  @Override
  protected void handleOnPause() {
    if (player != null) player.pause();
  }

  @Override
  protected void handleOnDestroy() {
    try { if (previewOutput != null) previewOutput.close(); } catch (Exception ignored) {}
    if (previewFile != null && previewFile.exists()) previewFile.delete();
    if (playerView != null) playerView.setPlayer(null);
    if (player != null) {
      player.release();
      player = null;
    }
    if (playerLayer != null && playerLayer.getParent() instanceof ViewGroup) {
      ((ViewGroup) playerLayer.getParent()).removeView(playerLayer);
    }
    playerView = null;
    playerLayer = null;
    super.handleOnDestroy();
  }
}

