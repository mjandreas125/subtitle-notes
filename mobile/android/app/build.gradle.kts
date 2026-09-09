import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// The upload key lives outside the repository and is named by key.properties,
// which is not committed either. A checkout without it still builds - it just
// falls back to the debug key, which Google Play refuses but `flutter run
// --release` accepts.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hasUploadKey = keystorePropertiesFile.exists()
if (hasUploadKey) {
    FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
}

android {
    namespace = "com.subtitlenotes"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // The identity the app is published under. It can never change again:
        // Google Play keys a listing to its package name for the life of the
        // app, so this line is one of the two decisions in this file that are
        // permanent.
        //
        // Sign-in works only for a pair of package name and signing
        // certificate registered with Google, so an Android OAuth client has
        // to exist for this package and the upload key's fingerprint
        // (2E:02:D5:95:83:E2:66:AC:E2:A0:46:08:1B:E4:B2:CD:0A:49:01:CE).
        // before a build of it can sign anybody in - and a second one for the
        // fingerprint Play App Signing shows after the first upload. The order
        // is in PLAY-RELEASE.md.
        applicationId = "com.subtitlenotes"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasUploadKey) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            // The upload key when this machine has it, the debug certificate
            // when it does not. Play refuses a debug-signed bundle, so a
            // release built without `android/key.properties` is for a phone
            // over a cable and nothing else - it is not a store build, and it
            // will not sign anybody in either, because its certificate is not
            // the registered one.
            signingConfig = if (hasUploadKey) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
