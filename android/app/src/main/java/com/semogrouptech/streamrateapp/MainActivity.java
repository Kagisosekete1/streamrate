package com.semogrouptech.streamrateapp;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    // Let the active reel start with its original sound after a swipe, without
    // WebView's native grey play overlay waiting for a second tap.
    getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
  }
}
