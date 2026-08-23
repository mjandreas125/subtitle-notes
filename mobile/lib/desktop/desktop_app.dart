import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../data.dart';
import '../design/tokens.dart';
import '../i18n.dart';
import 'desktop_config.dart';
import 'desktop_library.dart';
import 'desktop_updates.dart';
import 'pairing_screen.dart';

/// Windows entry point. Same tokens, same components, same account as the
/// phone — only the layout changes, because a desktop window is wide and the
/// pointer is precise.
class DesktopApp extends StatefulWidget {
  const DesktopApp({super.key});

  @override
  State<DesktopApp> createState() => _DesktopAppState();
}

class _DesktopAppState extends State<DesktopApp> {
  AppSettings _settings = const AppSettings();
  Session? _session;
  DesktopRelease? _update;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _session = DesktopConfig.load();
    AppSettings.load().then((value) {
      if (mounted) {
        setState(() {
          _settings = value;
          _loaded = true;
        });
      }
    });
    _checkForUpdate();
  }

  Future<void> _checkForUpdate() async {
    final update = await DesktopUpdates.check();
    if (mounted && update != null) setState(() => _update = update);
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
    home: Builder(
      builder: (context) {
        if (!_loaded) {
          return Scaffold(
            backgroundColor: context.c.bg,
            body: Center(
              child: CircularProgressIndicator(color: context.c.green),
            ),
          );
        }
        final session = _session;
        if (session == null) {
          return PairingScreen(
            language: resolvedInterfaceLanguage(_settings.interfaceLanguage),
            onConnected: (value) => setState(() => _session = value),
          );
        }
        return DesktopLibrary(
          session: session,
          settings: _settings,
          onSettingsChanged: _updateSettings,
          update: _update,
          onInstallUpdate: _update == null
              ? null
              : () => DesktopUpdates.install(_update!),
          onDisconnect: () {
            DesktopConfig.clear();
            setState(() => _session = null);
          },
        );
      },
    ),
  );
}
