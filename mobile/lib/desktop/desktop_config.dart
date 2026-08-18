import 'dart:convert';
import 'dart:io';

import '../data.dart';

/// Reads and writes the same `sync_config.json` the Python helper uses.
///
/// The VLC overlay, the quick-capture tool and this window all have to agree on
/// one account, so there is deliberately no second store: connecting here
/// connects the whole computer.
class DesktopConfig {
  static const _folderName = 'Translated VLC';
  static const _fileName = 'sync_config.json';
  static const _outboxName = 'sync_outbox.jsonl';

  static Directory get folder {
    final appData =
        Platform.environment['APPDATA'] ??
        Platform.environment['USERPROFILE'] ??
        Directory.current.path;
    return Directory('$appData${Platform.pathSeparator}$_folderName');
  }

  static File get file =>
      File('${folder.path}${Platform.pathSeparator}$_fileName');

  static File get outbox =>
      File('${folder.path}${Platform.pathSeparator}$_outboxName');

  /// Addresses that can no longer issue a usable session: the retired quick
  /// tunnel and the old local development server.
  static bool isLegacy(String url) =>
      url.contains('.trycloudflare.com') ||
      url.contains('127.0.0.1') ||
      url.contains('localhost') ||
      url.contains(':8088');

  static Map<String, dynamic> _read() {
    try {
      if (!file.existsSync()) return {};
      final value = jsonDecode(file.readAsStringSync());
      return value is Map<String, dynamic> ? value : {};
    } catch (_) {
      return {};
    }
  }

  static Session? load() {
    final config = _read();
    final base = (config['api_url'] as String? ?? '').trim();
    final token = (config['token'] as String? ?? '').trim();
    if (base.isEmpty || isLegacy(base) || token.isEmpty) return null;
    return Session(
      baseUrl: base,
      token: token,
      email: config['email'] as String? ?? '',
    );
  }

  static void save(Session session, {String displayName = ''}) {
    final config = _read()
      ..['api_url'] = session.baseUrl
      ..['token'] = session.token
      ..['email'] = session.email;
    if (displayName.isNotEmpty) config['display_name'] = displayName;
    folder.createSync(recursive: true);
    file.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(config));
  }

  static void clear() {
    final config = _read()..remove('token');
    config['api_url'] = defaultApiBase;
    folder.createSync(recursive: true);
    file.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(config));
  }

  /// Selections the VLC overlay could not send while this computer was
  /// unpaired or offline. They are shown so a queue never sits there silently.
  static int pendingCount() {
    try {
      if (!outbox.existsSync()) return 0;
      return outbox
          .readAsLinesSync()
          .where((line) => line.trim().isNotEmpty)
          .length;
    } catch (_) {
      return 0;
    }
  }
}
