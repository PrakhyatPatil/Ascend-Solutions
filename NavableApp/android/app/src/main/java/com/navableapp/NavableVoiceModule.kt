package com.navableapp

import android.media.MediaPlayer
import com.facebook.react.bridge.*
import java.io.File

class NavableVoiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var mediaPlayer: MediaPlayer? = null

    override fun getName(): String = "NavableVoice"

    @ReactMethod
    fun playAudio(filePath: String, promise: Promise) {
        try {
            val file = File(filePath.replace("file://", ""))
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "Audio file does not exist: $filePath")
                return
            }

            mediaPlayer?.release()
            mediaPlayer = MediaPlayer().apply {
                setDataSource(file.absolutePath)
                prepare()
                start()
                setOnCompletionListener {
                    it.release()
                    mediaPlayer = null
                    promise.resolve(true)
                }
                setOnErrorListener { _, _, _ ->
                    promise.reject("PLAYBACK_ERROR", "Failed to play audio")
                    true
                }
            }
        } catch (e: Exception) {
            promise.reject("PLAYBACK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopAudio(promise: Promise) {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }
}
