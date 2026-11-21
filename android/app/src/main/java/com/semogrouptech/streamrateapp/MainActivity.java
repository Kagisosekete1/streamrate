package com.semogrouptech.streamrateapp;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.graphics.Color;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(NativeReelPlayerPlugin.class);
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    // Allow the native Media3 texture underlay to show through the reel viewport.
    getBridge().getWebView().setBackgroundColor(Color.TRANSPARENT);
    // Let the active reel start with its original sound after a swipe, without
    // WebView's native grey play overlay waiting for a second tap.
    getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
  }
}
