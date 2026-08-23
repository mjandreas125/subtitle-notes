import 'dart:convert';

import 'package:flutter/material.dart';

import '../design/components.dart';
import '../design/tokens.dart';
import '../i18n.dart';
import 'desktop_config.dart';

/// What the player should do when a film is opened.
///
/// These live in the same `sync_config.json` as the account, because the VLC
/// overlay reads them from there. They used to be edited in a small Python
/// window of their own; a person who has this app installed should not have to
/// find a second program to say which language to watch in.
class PlayerSettings {
  const PlayerSettings({
    required this.audioLanguage,
    required this.subtitleLanguage,
    required this.answerSeconds,
    required this.seekSeconds,
    required this.spaceReadsLine,
  });

  final String audioLanguage;
  final String subtitleLanguage;
  final double answerSeconds;
  final int seekSeconds;
  final bool spaceReadsLine;

  static const defaults = PlayerSettings(
    audioLanguage: 'en',
    subtitleLanguage: 'en',
    answerSeconds: 6.5,
    seekSeconds: 10,
    spaceReadsLine: true,
  );

  static PlayerSettings load() {
    Map<String, dynamic> config = {};
    try {
      if (DesktopConfig.file.existsSync()) {
        final value = jsonDecode(DesktopConfig.file.readAsStringSync());
        if (value is Map<String, dynamic>) config = value;
      }
    } catch (_) {
      // An unreadable file simply means the defaults.
    }
    double asNumber(Object? value, double fallback) =>
        value is num ? value.toDouble() : fallback;
    return PlayerSettings(
      audioLanguage: config['audio_language'] as String? ?? 'en',
      subtitleLanguage: config['subtitle_language'] as String? ?? 'en',
      answerSeconds: asNumber(config['popup_seconds'], 6.5),
      seekSeconds: asNumber(config['seek_seconds'], 10).round(),
      spaceReadsLine: config['space_translates'] as bool? ?? true,
    );
  }

  /// Writes only these keys: the account lives in the same file.
  void save() {
    Map<String, dynamic> config = {};
    try {
      if (DesktopConfig.file.existsSync()) {
        final value = jsonDecode(DesktopConfig.file.readAsStringSync());
        if (value is Map<String, dynamic>) config = value;
      }
    } catch (_) {
      config = {};
    }
    config['audio_language'] = audioLanguage;
    config['subtitle_language'] = subtitleLanguage;
    config['popup_seconds'] = answerSeconds;
    config['seek_seconds'] = seekSeconds;
    config['space_translates'] = spaceReadsLine;
    try {
      DesktopConfig.folder.createSync(recursive: true);
      DesktopConfig.file.writeAsStringSync(
        const JsonEncoder.withIndent('  ').convert(config),
      );
    } catch (_) {
      // Nothing here is worth interrupting the window for.
    }
  }

  PlayerSettings copyWith({
    String? audioLanguage,
    String? subtitleLanguage,
    double? answerSeconds,
    int? seekSeconds,
    bool? spaceReadsLine,
  }) => PlayerSettings(
    audioLanguage: audioLanguage ?? this.audioLanguage,
    subtitleLanguage: subtitleLanguage ?? this.subtitleLanguage,
    answerSeconds: answerSeconds ?? this.answerSeconds,
    seekSeconds: seekSeconds ?? this.seekSeconds,
    spaceReadsLine: spaceReadsLine ?? this.spaceReadsLine,
  );
}

/// Each language named in itself, plus the film's own first track.
const _trackLanguages = <String, String>{
  '': 'As in the file',
  'en': 'English', 'ru': 'Русский', 'et': 'Eesti', 'de': 'Deutsch',
  'fr': 'Français', 'es': 'Español', 'it': 'Italiano', 'pt': 'Português',
  'pl': 'Polski', 'uk': 'Українська', 'nl': 'Nederlands', 'tr': 'Türkçe',
  'sv': 'Svenska', 'fi': 'Suomi', 'ja': '日本語', 'ko': '한국어', 'zh': '中文',
};

Future<void> showPlayerSettings(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (context) => const _PlayerSettingsDialog(),
  );
}

class _PlayerSettingsDialog extends StatefulWidget {
  const _PlayerSettingsDialog();

  @override
  State<_PlayerSettingsDialog> createState() => _PlayerSettingsDialogState();
}

class _PlayerSettingsDialogState extends State<_PlayerSettingsDialog> {
  late PlayerSettings _settings = PlayerSettings.load();

  void _update(PlayerSettings next) {
    setState(() => _settings = next);
    next.save();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Dialog(
      backgroundColor: c.surface,
      insetPadding: const EdgeInsets.all(AppSpace.xxl),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.sheet),
        side: BorderSide(color: c.line, width: 1.5),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 460),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpace.xxl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  IconTile(
                    icon: Icons.play_circle_rounded,
                    color: c.blue,
                    background: c.blueWash,
                    size: 44,
                  ),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.t('Films in VLC'),
                          style: AppText.heading(c.ink),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          context.t('Applies when a film is opened with Subtitle Notes.'),
                          style: AppText.caption(c.ink3),
                        ),
                      ],
                    ),
                  ),
                  Squish(
                    onTap: () => Navigator.pop(context),
                    child: IconTile(
                      icon: Icons.close_rounded,
                      color: c.ink3,
                      background: c.surfaceAlt,
                      size: 38,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpace.xxl),
              _Choice<String>(
                label: context.t('Sound'),
                value: _settings.audioLanguage,
                options: _trackLanguages.entries
                    .map((entry) => MapEntry(entry.key, context.t(entry.value)))
                    .toList(),
                onChanged: (value) =>
                    _update(_settings.copyWith(audioLanguage: value)),
              ),
              _Choice<String>(
                label: context.t('Subtitles'),
                value: _settings.subtitleLanguage,
                options: _trackLanguages.entries
                    .map((entry) => MapEntry(entry.key, context.t(entry.value)))
                    .toList(),
                onChanged: (value) =>
                    _update(_settings.copyWith(subtitleLanguage: value)),
              ),
              _Choice<double>(
                label: context.t('Answer stays'),
                value: _settings.answerSeconds,
                options: [
                  const MapEntry(3.0, '3 s'),
                  const MapEntry(5.0, '5 s'),
                  const MapEntry(6.5, '6.5 s'),
                  const MapEntry(10.0, '10 s'),
                  const MapEntry(15.0, '15 s'),
                  MapEntry(0.0, context.t('until the next one')),
                ],
                onChanged: (value) =>
                    _update(_settings.copyWith(answerSeconds: value)),
              ),
              _Choice<int>(
                label: context.t('Arrows jump'),
                value: _settings.seekSeconds,
                options: const [
                  MapEntry(1, '1 s'),
                  MapEntry(2, '2 s'),
                  MapEntry(3, '3 s'),
                  MapEntry(5, '5 s'),
                  MapEntry(10, '10 s'),
                  MapEntry(30, '30 s'),
                ],
                onChanged: (value) =>
                    _update(_settings.copyWith(seekSeconds: value)),
              ),
              _Choice<bool>(
                label: context.t('Space reads the line'),
                value: _settings.spaceReadsLine,
                options: [
                  MapEntry(true, context.t('on')),
                  MapEntry(false, context.t('off')),
                ],
                onChanged: (value) =>
                    _update(_settings.copyWith(spaceReadsLine: value)),
              ),
              const SizedBox(height: AppSpace.md),
              Text(
                context.t('A film without the chosen language plays with its own first track.'),
                style: AppText.caption(c.ink3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Choice<T> extends StatelessWidget {
  const _Choice({
    required this.label,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  final String label;
  final T value;
  final List<MapEntry<T, String>> options;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final known = options.any((option) => option.key == value);
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: Row(
        children: [
          Expanded(child: Text(label, style: AppText.body(c.ink))),
          const SizedBox(width: AppSpace.md),
          Container(
            width: 190,
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
            decoration: BoxDecoration(
              color: c.surfaceAlt,
              borderRadius: BorderRadius.circular(AppRadius.button),
              border: Border.all(color: c.line, width: 1.5),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<T>(
                value: known ? value : options.first.key,
                isExpanded: true,
                borderRadius: BorderRadius.circular(AppRadius.card),
                dropdownColor: c.surface,
                icon: Icon(Icons.expand_more_rounded, color: c.ink3),
                style: AppText.body(c.ink),
                items: [
                  for (final option in options)
                    DropdownMenuItem<T>(
                      value: option.key,
                      child: Text(
                        option.value,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.body(c.ink),
                      ),
                    ),
                ],
                onChanged: (next) {
                  if (next != null) onChanged(next);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
