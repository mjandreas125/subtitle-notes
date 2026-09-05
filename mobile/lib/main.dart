import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter/services.dart';

import 'data.dart';
import 'design/tokens.dart';
import 'desktop/desktop_app.dart';
import 'i18n.dart';
import 'screens/capture.dart';
import 'screens/connect_sheet.dart';
import 'screens/home.dart';
import 'screens/login.dart';
import 'screens/tour.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Windows shares the design system and the API client with the phone, but
  // not the shell: it pairs with a QR instead of signing in, and it reads the
  // account from the file the VLC helper already uses.
  if (Platform.isWindows) {
    runApp(const DesktopApp());
    return;
  }
  IncomingText.initialize();
  runApp(const SubtitleNotesApp());
}

class SubtitleNotesApp extends StatefulWidget {
  const SubtitleNotesApp({super.key});

  @override
  State<SubtitleNotesApp> createState() => _SubtitleNotesAppState();
}

class _SubtitleNotesAppState extends State<SubtitleNotesApp> {
  AppSettings _settings = const AppSettings();
  bool _settingsLoaded = false;

  @override
  void initState() {
    super.initState();
    AppSettings.load().then((value) {
      if (mounted) {
        setState(() {
          _settings = value;
          _settingsLoaded = true;
        });
      }
    });
  }

  Future<void> _updateSettings(AppSettings value) async {
    setState(() => _settings = value);
    await value.save();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Subtitle Notes',
    debugShowCheckedModeBanner: false,
    locale: Locale(resolvedInterfaceLanguage(_settings.interfaceLanguage)),
    supportedLocales: interfaceLanguages.keys
        .where((code) => code != 'auto')
        .map(Locale.new)
        .toList(growable: false),
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    themeMode: _settings.themeMode,
    theme: buildTheme(AppColors.light, Brightness.light),
    darkTheme: buildTheme(AppColors.dark, Brightness.dark),
    builder: (context, child) {
      final c = context.c;
      final dark = Theme.of(context).brightness == Brightness.dark;
      // Keep the system bars in step with the theme so the top of the screen
      // never sits on a mismatched strip of colour.
      SystemChrome.setSystemUIOverlayStyle(
        SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
          statusBarBrightness: dark ? Brightness.dark : Brightness.light,
          systemNavigationBarColor: c.surface,
          systemNavigationBarIconBrightness: dark
              ? Brightness.light
              : Brightness.dark,
          systemNavigationBarDividerColor: c.line,
        ),
      );
      // Respect the reader's text-size preference, but stop the largest
      // settings from breaking two-line layouts outright.
      final scale = MediaQuery.textScalerOf(context).clamp(
        minScaleFactor: .9,
        maxScaleFactor: 1.35,
      );
      return MediaQuery(
        data: MediaQuery.of(context).copyWith(textScaler: scale),
        child: child ?? const SizedBox.shrink(),
      );
    },
    home: _settingsLoaded
        ? BootstrapPage(
            settings: _settings,
            onSettingsChanged: _updateSettings,
          )
        : const _Splash(),
  );
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      backgroundColor: c.bg,
      body: Center(child: CircularProgressIndicator(color: c.green)),
    );
  }
}

class BootstrapPage extends StatefulWidget {
  const BootstrapPage({
    required this.settings,
    required this.onSettingsChanged,
    super.key,
  });

  final AppSettings settings;
  final ValueChanged<AppSettings> onSettingsChanged;

  @override
  State<BootstrapPage> createState() => _BootstrapPageState();
}

class _BootstrapPageState extends State<BootstrapPage> {
  Session? _session;
  bool _sessionChecked = false;
  final _homeKey = GlobalKey<HomeShellState>();
  String? _incomingText;
  String? _pairCode;
  bool _savingIncoming = false;

  @override
  void initState() {
    super.initState();
    IncomingText.value.addListener(_receiveIncomingText);
    IncomingText.pairCode.addListener(_receivePairCode);
    IncomingText.takeInitial();
    SessionStore.load().then((value) {
      if (mounted) {
        setState(() {
          _session = value;
          _sessionChecked = true;
        });
      }
    });
  }

  @override
  void dispose() {
    IncomingText.value.removeListener(_receiveIncomingText);
    IncomingText.pairCode.removeListener(_receivePairCode);
    super.dispose();
  }

  void _receivePairCode() {
    final code = IncomingText.pairCode.value;
    if (code?.isNotEmpty == true && mounted) {
      setState(() => _pairCode = code);
    }
  }

  Future<void> _receiveIncomingText() async {
    final text = IncomingText.value.value;
    if (text?.isNotEmpty == true && mounted) {
      if (_session != null &&
          widget.settings.captureMode == CaptureMode.saveImmediately) {
        setState(() => _savingIncoming = true);
        try {
          await SyncApi(
            _session!,
          ).capture(text: text!, mediaTitle: 'Android selection');
          await _homeKey.currentState?.reload();
          IncomingText.value.value = null;
        } on ApiException {
          if (mounted) setState(() => _incomingText = text);
        } finally {
          if (mounted) setState(() => _savingIncoming = false);
        }
      } else {
        setState(() => _incomingText = text);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_sessionChecked) return const _Splash();
    // What the app is comes before anybody is asked to sign in to it, once.
    if (_session == null && !widget.settings.tourSeen) {
      return TourPage(
        onDone: () =>
            widget.onSettingsChanged(widget.settings.copyWith(tourSeen: true)),
      );
    }
    if (_session == null) {
      return LoginPage(
        onAuthenticated: (value) => setState(() => _session = value),
      );
    }
    return Stack(
      children: [
        HomeShell(
          key: _homeKey,
          session: _session!,
          settings: widget.settings,
          onSettingsChanged: widget.onSettingsChanged,
          onSignOut: () => setState(() => _session = null),
          // A renewed session is a new token; everything below has to be
          // rebuilt with it.
          onSessionRenewed: (session) => setState(() => _session = session),
        ),
        if (_savingIncoming)
          const Align(
            alignment: Alignment.topCenter,
            child: SafeArea(child: SavingPill()),
          ),
        if (_pairCode != null)
          ConnectSheet(
            api: SyncApi(_session!),
            code: _pairCode!,
            onClose: () => setState(() {
              _pairCode = null;
              IncomingText.pairCode.value = null;
            }),
          ),
        if (_incomingText != null)
          CaptureSheet(
            api: SyncApi(_session!),
            text: _incomingText!,
            onClose: () => setState(() {
              _incomingText = null;
              IncomingText.value.value = null;
            }),
            onSaved: () => _homeKey.currentState?.reload(),
          ),
      ],
    );
  }
}
