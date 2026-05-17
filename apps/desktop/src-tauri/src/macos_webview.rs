//! Patch WKWebView so the embedded webview exposes `navigator.mediaDevices`.
//!
//! WKWebView ships with the media-capture APIs gated off — calling
//! `navigator.mediaDevices.getUserMedia` from a Tauri app raises
//! `undefined is not an object`.  Apple only exposes the toggles through
//! private KVC keys on `WKPreferences`.  We flip them here.
//!
//! Granting the runtime permission prompt itself is already handled by wry's
//! `requestMediaCapturePermissionForOrigin` delegate, so once these flags are
//! on the OS dialog appears as expected (and the user must still have
//! NSCameraUsageDescription / NSMicrophoneUsageDescription in Info.plist).

#![cfg(target_os = "macos")]

use objc2::msg_send;
use objc2::runtime::AnyObject;
use objc2_foundation::{ns_string, NSNumber};

/// Enable the private WKWebView preferences that surface `navigator.mediaDevices`.
/// `webview_ptr` is the raw `WKWebView` pointer returned by
/// `tauri::webview::PlatformWebview::inner()`.
pub fn enable_media_devices(webview_ptr: *mut std::ffi::c_void) {
    if webview_ptr.is_null() {
        tracing::warn!("enable_media_devices: webview pointer is null, skipping");
        return;
    }

    unsafe {
        let webview = webview_ptr as *mut AnyObject;
        let config: *mut AnyObject = msg_send![&*webview, configuration];
        let preferences: *mut AnyObject = msg_send![&*config, preferences];

        let yes = NSNumber::numberWithBool(true);
        let no = NSNumber::numberWithBool(false);

        // Primary toggle — without this `navigator.mediaDevices` is undefined
        // even though all the underlying machinery is linked in.
        let _: () = msg_send![
            &*preferences,
            setValue: Some(&*yes),
            forKey: ns_string!("mediaDevicesEnabled"),
        ];
        // Permits capture when the page is served over plain http://localhost
        // (Vite dev server).  Without this, mediaDevices may stay hidden even
        // when the flag above is set, because WKWebView considers the page
        // insecure.
        let _: () = msg_send![
            &*preferences,
            setValue: Some(&*no),
            forKey: ns_string!("mediaCaptureRequiresSecureConnection"),
        ];
        // Belt-and-braces — different macOS versions check different keys.
        let _: () = msg_send![
            &*preferences,
            setValue: Some(&*yes),
            forKey: ns_string!("peerConnectionEnabled"),
        ];
        let _: () = msg_send![
            &*preferences,
            setValue: Some(&*yes),
            forKey: ns_string!("mediaStreamEnabled"),
        ];
        let _: () = msg_send![
            &*preferences,
            setValue: Some(&*yes),
            forKey: ns_string!("screenCaptureEnabled"),
        ];
    }

    tracing::info!("WKWebView: enabled private media-device preferences");
}
