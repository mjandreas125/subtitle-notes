import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// OAuth client IDs are public identifiers, not secrets. The server checks the
// signed Google ID token against this web client before it creates a session.
const googleServerClientId =
    '151185018789-tjda40ks4kb2vo8s30f9359n2b9o4dlb.apps.googleusercontent.com';

// Permanent public API. This is a Cloudflare Worker, so it does not depend on
// the creator's computer, a home IP address, or a short-lived tunnel.
const defaultApiBase =
    'https://app.subtitlenotes.workers.dev/v1';

class IncomingText {
  static const _channel = MethodChannel(
    'ee.subtitlenotes.app/selection',
  );
  static final value = ValueNotifier<String?>(null);

  /// Set when the phone's camera opened a `subtitlenotes://pair` link.
  static final pairCode = ValueNotifier<String?>(null);

  static void initialize() {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'incomingText' && call.arguments is String) {
        value.value = (call.arguments as String).trim();
      }
      if (call.method == 'incomingPairCode' && call.arguments is String) {
        pairCode.value = (call.arguments as String).trim();
      }
    });
  }

  static Future<void> takeInitial() async {
    final text = await _channel.invokeMethod<String>('takeInitialText');
    if (text?.trim().isNotEmpty == true) value.value = text!.trim();
    final code = await _channel.invokeMethod<String>('takeInitialPairCode');
    if (code?.trim().isNotEmpty == true) pairCode.value = code!.trim();
  }
}

class Session {
  const Session({
    required this.baseUrl,
    required this.token,
    required this.email,
  });
  final String baseUrl;
  final String token;
  final String email;
}

class SessionStore {
  static const _baseKey = 'api_base';
  static const _tokenKey = 'api_token';
  static const _emailKey = 'email';

  static Future<Session?> load() async {
    final data = await SharedPreferences.getInstance();
    final base = data.getString(_baseKey) ?? '';
    final token = data.getString(_tokenKey) ?? '';
    // Sessions issued by the old temporary tunnel cannot be used by the
    // permanent cloud API. Keep cached learning cards, but require one safe
    // Google re-sign-in to issue a cloud session.
    if (base.contains('.trycloudflare.com')) {
      await data.setString(_baseKey, defaultApiBase);
      await data.remove(_tokenKey);
      return null;
    }
    // The Workers subdomain used to carry the owner's e-mail. Only the address
    // moved; the address is rewritten here and whether there is a session at
    // all is decided below, as for anyone else. Handing back a session with an
    // empty token made the app believe it was signed in and refuse every
    // request it then made.
    final resolved =
        base.contains('andreas-sultseng228.workers.dev') ? defaultApiBase : base;
    if (resolved != base) await data.setString(_baseKey, resolved);
    if (resolved.isEmpty || token.isEmpty) return null;
    return Session(
      baseUrl: resolved,
      token: token,
      email: data.getString(_emailKey) ?? '',
    );
  }

  static Future<void> save(Session session) async {
    final data = await SharedPreferences.getInstance();
    await data.setString(_baseKey, session.baseUrl);
    await data.setString(_tokenKey, session.token);
    await data.setString(_emailKey, session.email);
  }

  static Future<void> clear() async {
    final data = await SharedPreferences.getInstance();
    await data.remove(_tokenKey);
  }
}

enum CaptureMode { review, saveImmediately }

enum LibraryLayout { list, grid }

class AppSettings {
  const AppSettings({
    this.captureMode = CaptureMode.saveImmediately,
    this.showOriginal = true,
    this.compactCards = false,
    this.libraryLayout = LibraryLayout.list,
    this.themeMode = ThemeMode.system,
    this.tipDismissed = false,
    this.simpleMode = false,
    this.interfaceLanguage = 'auto',
  });

  final CaptureMode captureMode;
  final bool showOriginal, compactCards;
  final LibraryLayout libraryLayout;
  final ThemeMode themeMode;

  /// `auto` follows Android/Windows; any supported two-letter code is a
  /// deliberate per-app override for readers who use a different phone UI.
  final String interfaceLanguage;

  /// The library hint stays gone once it has been closed.
  final bool tipDismissed;

  /// Words and nothing else: no friends, no games, no achievements. Someone
  /// who came here to collect vocabulary should not have to walk past four
  /// other things to reach it.
  final bool simpleMode;

  AppSettings copyWith({
    CaptureMode? captureMode,
    bool? showOriginal,
    bool? compactCards,
    LibraryLayout? libraryLayout,
    ThemeMode? themeMode,
    String? interfaceLanguage,
    bool? tipDismissed,
    bool? simpleMode,
  }) => AppSettings(
    captureMode: captureMode ?? this.captureMode,
    showOriginal: showOriginal ?? this.showOriginal,
    compactCards: compactCards ?? this.compactCards,
    libraryLayout: libraryLayout ?? this.libraryLayout,
    themeMode: themeMode ?? this.themeMode,
    interfaceLanguage: interfaceLanguage ?? this.interfaceLanguage,
    tipDismissed: tipDismissed ?? this.tipDismissed,
    simpleMode: simpleMode ?? this.simpleMode,
  );

  static Future<AppSettings> load() async {
    final data = await SharedPreferences.getInstance();
    return AppSettings(
      captureMode: data.getString('capture_mode') == 'review'
          ? CaptureMode.review
          : CaptureMode.saveImmediately,
      showOriginal: data.getBool('show_original') ?? true,
      compactCards: data.getBool('compact_cards') ?? false,
      libraryLayout: data.getString('library_layout') == 'grid'
          ? LibraryLayout.grid
          : LibraryLayout.list,
      themeMode: switch (data.getString('theme_mode')) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      },
      tipDismissed: data.getBool('tip_dismissed') ?? false,
      simpleMode: data.getBool('simple_mode') ?? false,
      interfaceLanguage: data.getString('interface_language') ?? 'auto',
    );
  }

  Future<void> save() async {
    final data = await SharedPreferences.getInstance();
    await data.setString(
      'capture_mode',
      captureMode == CaptureMode.saveImmediately ? 'instant' : 'review',
    );
    await data.setBool('show_original', showOriginal);
    await data.setBool('compact_cards', compactCards);
    await data.setString(
      'library_layout',
      libraryLayout == LibraryLayout.grid ? 'grid' : 'list',
    );
    await data.setString('theme_mode', switch (themeMode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    });
    await data.setBool('tip_dismissed', tipDismissed);
    await data.setBool('simple_mode', simpleMode);
    await data.setString('interface_language', interfaceLanguage);
  }
}

class NativeBridge {
  static const _channel = MethodChannel(
    'ee.subtitlenotes.app/companion',
  );

  static Future<void> syncCompanionCards(List<StudyCard> cards) async {
    await _channel.invokeMethod<void>('syncCompanionContent', {
      'cards': cards.map((card) => card.companionMap).toList(),
    });
  }

  /// Asks the launcher to place the home-screen widget. False means the
  /// launcher does not support pinning and the user has to add it by hand.
  static Future<bool> pinWidget() async =>
      await _channel.invokeMethod<bool>('pinWidget') ?? false;

  static Future<void> setLockWallpaper(StudyCard card) =>
      _channel.invokeMethod<void>('setLockWallpaper', {
        'word': card.learningLabel,
        'translation': card.focusTranslation?.isNotEmpty == true
            ? card.focusTranslation
            : card.translation,
      });
}

/// The signed-in account as the server sees it.
/// The languages a card can be written in, each named in itself: someone
/// looking for Estonian is looking for "Eesti", not for "Estonian".
const cardLanguages = <String, String>{
  'ru': 'Русский', 'en': 'English', 'et': 'Eesti', 'de': 'Deutsch',
  'fr': 'Français', 'es': 'Español', 'it': 'Italiano', 'pt': 'Português',
  'pl': 'Polski', 'uk': 'Українська', 'nl': 'Nederlands', 'tr': 'Türkçe',
  'sv': 'Svenska', 'fi': 'Suomi',
};

class Profile {
  const Profile({
    required this.id,
    required this.email,
    required this.displayName,
    required this.nickname,
    required this.shareFeed,
    required this.friendCount,
    required this.followerCount,
    required this.language,
  });

  final String id, email, displayName;
  final String? nickname;
  final bool shareFeed;
  final int friendCount, followerCount;

  /// The language new cards are explained in. Already saved cards keep the
  /// language they were written in.
  final String language;

  /// What other people see. Falls back to the Google name until a nickname is
  /// chosen, so nobody ever appears as a blank row.
  String get handle => nickname?.isNotEmpty == true
      ? nickname!
      : displayName.isNotEmpty
      ? displayName
      : email.split('@').first;

  bool get needsNickname => nickname == null || nickname!.isEmpty;

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
    id: json['id'] as String? ?? '',
    email: json['email'] as String? ?? '',
    displayName: json['display_name'] as String? ?? '',
    nickname: (json['nickname'] as String?)?.trim().isEmpty == true
        ? null
        : json['nickname'] as String?,
    shareFeed: json['share_feed'] as bool? ?? true,
    friendCount: json['friend_count'] as int? ?? 0,
    followerCount: json['follower_count'] as int? ?? 0,
    language: (json['language'] as String?)?.trim().isNotEmpty == true
        ? json['language'] as String
        : 'ru',
  );
}

/// Someone else, in a search result or a friends list.
class Person {
  const Person({
    required this.id,
    required this.nickname,
    required this.displayName,
    required this.wordCount,
    required this.following,
  });

  final String id;
  final String? nickname;
  final String displayName;
  final int wordCount;
  final bool following;

  String get handle => nickname?.isNotEmpty == true ? nickname! : displayName;

  Person copyWith({bool? following}) => Person(
    id: id,
    nickname: nickname,
    displayName: displayName,
    wordCount: wordCount,
    following: following ?? this.following,
  );

  factory Person.fromJson(Map<String, dynamic> json) => Person(
    id: json['id'] as String? ?? '',
    nickname: json['nickname'] as String?,
    displayName: json['display_name'] as String? ?? '',
    wordCount: json['word_count'] as int? ?? 0,
    following: json['following'] as bool? ?? false,
  );
}

/// A word somebody saved, as it appears in the shared feed.
class FeedItem {
  const FeedItem({
    required this.id,
    required this.authorId,
    required this.authorHandle,
    required this.mediaTitle,
    required this.word,
    required this.meaning,
    required this.line,
    required this.createdAt,
    required this.likeCount,
    required this.liked,
    required this.mine,
  });

  final String id, authorId, authorHandle, mediaTitle, word, meaning;
  final String? line;
  final DateTime createdAt;
  final int likeCount;
  final bool liked, mine;

  FeedItem copyWith({int? likeCount, bool? liked}) => FeedItem(
    id: id,
    authorId: authorId,
    authorHandle: authorHandle,
    mediaTitle: mediaTitle,
    word: word,
    meaning: meaning,
    line: line,
    createdAt: createdAt,
    likeCount: likeCount ?? this.likeCount,
    liked: liked ?? this.liked,
    mine: mine,
  );

  factory FeedItem.fromJson(Map<String, dynamic> json) {
    final selected = json['selected_text'] as String? ?? '';
    final word = (json['focus_phrase'] as String?)?.isNotEmpty == true
        ? json['focus_phrase'] as String
        : (json['focus_word'] as String?)?.isNotEmpty == true
        ? json['focus_word'] as String
        : selected;
    final meaning = (json['focus_translation'] as String?)?.isNotEmpty == true
        ? json['focus_translation'] as String
        : json['translation'] as String? ?? '';
    final nickname = json['author_nickname'] as String?;
    final name = json['author_name'] as String? ?? '';
    return FeedItem(
      id: json['id'] as String? ?? '',
      authorId: json['author_id'] as String? ?? '',
      authorHandle: nickname?.isNotEmpty == true ? nickname! : name,
      mediaTitle: json['media_title'] as String? ?? '',
      word: word,
      meaning: meaning,
      line: StudyCard.bare(selected) == StudyCard.bare(word) ? null : selected,
      createdAt:
          DateTime.tryParse(json['created_at'] as String? ?? '')?.toLocal() ??
          DateTime.now(),
      likeCount: json['like_count'] as int? ?? 0,
      liked: json['liked'] as bool? ?? false,
      mine: json['mine'] as bool? ?? false,
    );
  }

  /// "2 h", "3 d" - short enough to sit at the end of a header row.
  String get age {
    final gap = DateTime.now().difference(createdAt);
    if (gap.inMinutes < 1) return 'now';
    if (gap.inMinutes < 60) return '${gap.inMinutes} min';
    if (gap.inHours < 24) return '${gap.inHours} h';
    if (gap.inDays < 7) return '${gap.inDays} d';
    return '${(gap.inDays / 7).floor()} w';
  }
}

/// A pending device pairing. The secret proves to the server that the poller
/// is the same program that asked for the code.
class PairingRequest {
  const PairingRequest({
    required this.baseUrl,
    required this.id,
    required this.code,
    required this.secret,
  });

  final String baseUrl, id, code, secret;

  /// What the QR encodes. The phone accepts this link or a typed code, so a
  /// scanner that mangles the URL still leaves the manual path working.
  String get qrPayload => 'subtitlenotes://pair?code=$code'
      '&api=${Uri.encodeComponent(baseUrl)}';

  /// Reads a scanned payload back into a code. Accepts the full link and a
  /// bare eight-character code.
  static String? codeFrom(String scanned) {
    final value = scanned.trim();
    if (value.isEmpty) return null;
    final uri = Uri.tryParse(value);
    final fromQuery = uri?.queryParameters['code'];
    final candidate = (fromQuery ?? value).trim().toUpperCase();
    return RegExp(r'^[A-Z0-9]{6,12}$').hasMatch(candidate) ? candidate : null;
  }

  /// The server address carried by a scanned link, when it has one.
  static String? apiFrom(String scanned) {
    final api = Uri.tryParse(scanned.trim())?.queryParameters['api'];
    if (api == null || api.isEmpty) return null;
    return api.startsWith('http') ? api : null;
  }
}

class ApiException implements Exception {
  ApiException(this.message, {this.expired = false});
  final String message;

  /// The server refused the session rather than the request. Everything else
  /// is worth showing to the reader; this one is worth acting on, because no
  /// amount of retrying will fix it.
  final bool expired;

  @override
  String toString() => message;
}

class SyncApi {
  const SyncApi(this.session);
  final Session session;

  Uri _uri(String path) =>
      Uri.parse('${session.baseUrl.replaceFirst(RegExp(r'/+$'), '')}$path');
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${session.token}',
  };

  static Future<Session> authenticate({
    required String baseUrl,
    required String email,
    required String password,
    required bool register,
    String displayName = '',
  }) async {
    final normalized = baseUrl.replaceFirst(RegExp(r'/+$'), '');
    if (!normalized.startsWith('http://') &&
        !normalized.startsWith('https://')) {
      throw ApiException('Server address must start with http:// or https://');
    }
    try {
      final response = await http
          .post(
            Uri.parse('$normalized/auth/${register ? 'register' : 'login'}'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email.trim(),
              'password': password,
              'display_name': displayName.trim(),
            }),
          )
          .timeout(const Duration(seconds: 12));
      final body = _readMap(response);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw _fail(body, response.statusCode);
      }
      final token = body['token'] as String? ?? '';
      if (token.isEmpty) {
        throw ApiException('The server did not return a session.');
      }
      return Session(baseUrl: normalized, token: token, email: email.trim());
    } catch (error) {
      if (error is ApiException) rethrow;
      throw ApiException(
        'Cannot reach the server. Check the address and Wi-Fi.',
      );
    }
  }

  static Future<Session> authenticateGoogle({
    required String baseUrl,
    required String idToken,
  }) async {
    final normalized = baseUrl.replaceFirst(RegExp(r'/+$'), '');
    if (!normalized.startsWith('http://') &&
        !normalized.startsWith('https://')) {
      throw ApiException('Server address must start with http:// or https://');
    }
    try {
      final response = await http
          .post(
            Uri.parse('$normalized/auth/google'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'id_token': idToken}),
          )
          .timeout(const Duration(seconds: 12));
      final body = _readMap(response);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw _fail(body, response.statusCode);
      }
      final token = body['token'] as String? ?? '';
      final user = body['user'] is Map ? body['user'] as Map : const {};
      if (token.isEmpty) {
        throw ApiException('The server did not return a session.');
      }
      return Session(
        baseUrl: normalized,
        token: token,
        email: user['email']?.toString() ?? '',
      );
    } catch (error) {
      if (error is ApiException) rethrow;
      throw ApiException(
        'Cannot reach the server. Check the address and Wi-Fi.',
      );
    }
  }

  Future<List<StudyCard>> cards({bool archived = false}) async {
    final response = await http
        .get(_uri('/selections?archived=$archived'), headers: _headers)
        .timeout(const Duration(seconds: 12));
    final value = jsonDecode(response.body);
    if (response.statusCode != 200 || value is! List) {
      throw _fail(value, response.statusCode);
    }
    return value
        .whereType<Map<String, dynamic>>()
        .map(StudyCard.fromJson)
        .toList();
  }

  Future<StudyDetail> detail(String id) async {
    final response = await http
        .get(_uri('/selections/$id'), headers: _headers)
        .timeout(const Duration(seconds: 12));
    final body = _readMap(response);
    if (response.statusCode != 200) {
      throw _fail(body, response.statusCode);
    }
    // Kept so the same card can be opened on the underground later.
    unawaited(DetailCache.save(id, body));
    return StudyDetail.fromJson(body);
  }

  /// Reads the saved line again with the server's slower, better model. The
  /// subtitle itself is never touched - only what was worked out from it.
  Future<StudyDetail> reread(String id) async {
    final response = await http
        .post(_uri('/selections/$id/reenrich'), headers: _headers)
        .timeout(const Duration(seconds: 40));
    final body = _readMap(response);
    if (response.statusCode != 200) {
      throw _fail(body, response.statusCode);
    }
    unawaited(DetailCache.save(id, body));
    return StudyDetail.fromJson(body);
  }

  /// The reader's own wording for a card.
  ///
  /// It replaces the meaning on their own card at once and counts as a vote:
  /// when enough different people write the same thing for the same
  /// expression, the server starts giving it to everybody.
  Future<({StudyDetail card, int votes, int quorum})> suggest(
    String id,
    String text,
  ) async {
    final response = await http
        .post(
          _uri('/selections/$id/suggest'),
          headers: _headers,
          body: jsonEncode({'text': text.trim()}),
        )
        .timeout(const Duration(seconds: 15));
    final body = _readMap(response);
    if (response.statusCode != 200) throw _fail(body, response.statusCode);
    return (
      card: StudyDetail.fromJson(body),
      votes: body['votes'] as int? ?? 1,
      quorum: body['quorum'] as int? ?? 3,
    );
  }

  /// The words due to be met again, soonest first.
  Future<List<StudyCard>> due() async =>
      (await _getList('/review')).map(StudyCard.fromJson).toList();

  /// Records how a word went. "again" sends it back to the start of the
  /// ladder, "good" moves it one rung up, "easy" two.
  Future<void> reviewed(String id, String result) async {
    final response = await http
        .post(
          _uri('/selections/$id/review'),
          headers: _headers,
          body: jsonEncode({'result': result}),
        )
        .timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) {
      throw _fail(_readMap(response), response.statusCode);
    }
  }

  Future<void> delete(String id) async {
    final response = await http
        .delete(_uri('/selections/$id'), headers: _headers)
        .timeout(const Duration(seconds: 12));
    if (response.statusCode != 204) {
      throw _fail(_readMap(response), response.statusCode);
    }
  }

  Future<void> setArchived(String id, {required bool archived}) async {
    final response = await http
        .patch(
          _uri('/selections/$id/archive'),
          headers: _headers,
          body: jsonEncode({'archived': archived}),
        )
        .timeout(const Duration(seconds: 12));
    if (response.statusCode != 200) {
      throw _fail(_readMap(response), response.statusCode);
    }
  }

  Future<void> capture({
    required String text,
    required String mediaTitle,
  }) async {
    final response = await http
        .post(
          _uri('/captures'),
          headers: _headers,
          body: jsonEncode({
            'client_key':
                'android-${DateTime.now().microsecondsSinceEpoch}-${text.hashCode}',
            'selected_text': text,
            'media_title': mediaTitle.isEmpty
                ? 'Android selection'
                : mediaTitle,
          }),
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _fail(_readMap(response), response.statusCode);
    }
  }

  /// Desktop side of pairing: ask the server for a code, then wait for the
  /// phone to approve it. No account credentials ever touch this computer.
  static Future<PairingRequest> startPairing({
    required String baseUrl,
    required String deviceName,
  }) async {
    final normalized = baseUrl.replaceFirst(RegExp(r'/+$'), '');
    try {
      final response = await http
          .post(
            Uri.parse('$normalized/pairings/start'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'device_name': deviceName}),
          )
          .timeout(const Duration(seconds: 12));
      final body = _readMap(response);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw _fail(body, response.statusCode);
      }
      final id = body['pairing_id'] as String? ?? '';
      final code = body['code'] as String? ?? '';
      final secret = body['request_secret'] as String? ?? '';
      if (id.isEmpty || code.isEmpty || secret.isEmpty) {
        throw ApiException('The server did not create a pairing code.');
      }
      return PairingRequest(
        baseUrl: normalized,
        id: id,
        code: code,
        secret: secret,
      );
    } catch (error) {
      if (error is ApiException) rethrow;
      throw ApiException('Cannot reach the server. Check your connection.');
    }
  }

  /// Returns the session once the phone has approved, or null while waiting.
  static Future<Session?> pollPairing(PairingRequest request) async {
    final response = await http
        .post(
          Uri.parse('${request.baseUrl}/pairings/poll'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'pairing_id': request.id,
            'request_secret': request.secret,
          }),
        )
        .timeout(const Duration(seconds: 12));
    final body = _readMap(response);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _fail(body, response.statusCode);
    }
    if (body['status'] != 'connected') return null;
    final user = body['user'] is Map ? body['user'] as Map : const {};
    return Session(
      baseUrl: request.baseUrl,
      token: body['token'] as String? ?? '',
      email: user['email']?.toString() ?? '',
    );
  }

  /// Posts an already-prepared selection payload. Used to drain the desktop
  /// outbox; the server deduplicates by client key, so a resend is harmless.
  /// Sends a selection the VLC helper parked while this computer was offline.
  ///
  /// `/captures`, not `/selections`: the cloud detects which language the
  /// subtitle was in and derives the card itself, where `/selections` would
  /// store whatever the local dictionary made of it - which is how an English
  /// line could end up filed as its own translation. The Python side has sent
  /// these to `/captures` for a while; this one had not caught up.
  Future<void> postSelection(Map<String, dynamic> payload) async {
    final response = await http
        .post(_uri('/captures'), headers: _headers, body: jsonEncode(payload))
        .timeout(const Duration(seconds: 15));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _fail(_readMap(response), response.statusCode);
    }
  }

  // ---- profile, people and the shared feed --------------------------------

  Future<Profile> me() async => Profile.fromJson(await _get('/me'));

  Future<Profile> updateProfile({
    String? nickname,
    bool? shareFeed,
    String? language,
  }) async {
    final response = await http
        .patch(
          _uri('/me'),
          headers: _headers,
          // Only the fields actually being changed are sent, so updating the
          // sharing switch can never overwrite a nickname.
          body: jsonEncode({
            if (nickname != null) 'nickname': nickname.trim(),
            'share_feed': ?shareFeed,
            'language': ?language,
          }),
        )
        .timeout(const Duration(seconds: 12));
    final body = _readMap(response);
    if (response.statusCode != 200) {
      throw _fail(body, response.statusCode);
    }
    return Profile.fromJson(body);
  }

  Future<List<Person>> searchPeople(String query) async =>
      (await _getList('/users/search?q=${Uri.encodeQueryComponent(query)}'))
          .map(Person.fromJson)
          .toList();

  Future<List<Person>> friends() async =>
      (await _getList('/friends')).map(Person.fromJson).toList();

  /// Erases the account and everything stored under it. There is no copy kept
  /// on the server afterwards, so nothing is left to restore.
  Future<void> deleteAccount() async {
    final response = await http
        .delete(_uri('/me'), headers: _headers)
        .timeout(const Duration(seconds: 20));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _fail(_readMap(response), response.statusCode);
    }
  }

  Future<void> setFriend(String id, {required bool add}) async {
    final uri = _uri('/friends/$id');
    final response = await (add
            ? http.post(uri, headers: _headers)
            : http.delete(uri, headers: _headers))
        .timeout(const Duration(seconds: 12));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _fail(_readMap(response), response.statusCode);
    }
  }

  Future<List<FeedItem>> feed() async =>
      (await _getList('/feed')).map(FeedItem.fromJson).toList();

  /// Returns the new like count.
  Future<int> setLike(String selectionId, {required bool liked}) async {
    final uri = _uri('/selections/$selectionId/like');
    final response = await (liked
            ? http.post(uri, headers: _headers)
            : http.delete(uri, headers: _headers))
        .timeout(const Duration(seconds: 12));
    final body = _readMap(response);
    if (response.statusCode != 200) {
      throw _fail(body, response.statusCode);
    }
    return body['like_count'] as int? ?? 0;
  }

  Future<Map<String, dynamic>> _get(String path) async {
    final response = await http
        .get(_uri(path), headers: _headers)
        .timeout(const Duration(seconds: 12));
    final body = _readMap(response);
    if (response.statusCode != 200) {
      throw _fail(body, response.statusCode);
    }
    return body;
  }

  Future<List<Map<String, dynamic>>> _getList(String path) async {
    final response = await http
        .get(_uri(path), headers: _headers)
        .timeout(const Duration(seconds: 12));
    final value = jsonDecode(response.body.isEmpty ? '[]' : response.body);
    if (response.statusCode != 200 || value is! List) {
      throw _fail(value, response.statusCode);
    }
    return value.whereType<Map<String, dynamic>>().toList();
  }

  Future<void> approvePairing(String code) async {
    final response = await http
        .post(
          _uri('/pairings/approve'),
          headers: _headers,
          body: jsonEncode({'code': code.trim().toUpperCase()}),
        )
        .timeout(const Duration(seconds: 12));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _fail(_readMap(response), response.statusCode);
    }
  }

  static Map<String, dynamic> _readMap(http.Response response) {
    final value = jsonDecode(response.body.isEmpty ? '{}' : response.body);
    return value is Map<String, dynamic> ? value : <String, dynamic>{};
  }

  /// Raised instead of a plain failure whenever the server says the session is
  /// no longer good, so the app can quietly sign in again rather than showing
  /// "Unauthorized" over an empty library.
  static ApiException _fail(dynamic body, int status) => ApiException(
    _detail(body, status),
    expired: status == 401,
  );

  static String _detail(dynamic value, int status) =>
      value is Map && value['detail'] != null
      ? value['detail'].toString()
      : 'Server error ($status)';
}

class StudyCard {
  const StudyCard({
    required this.id,
    required this.mediaTitle,
    required this.season,
    required this.episode,
    required this.timecodeMs,
    required this.selectedText,
    required this.translation,
    required this.focusWord,
    required this.focusPhrase,
    required this.focusTranslation,
    required this.synonyms,
    required this.senseNote,
    required this.archived,
    required this.createdAt,
    this.context,
  });
  final String id, mediaTitle, selectedText, translation;
  final String? season, episode, focusWord, focusPhrase, focusTranslation;
  /// Other Russian words for the same sense. A translation like
  /// "эксклюзивный" teaches nothing on its own; "особый, только для избранных"
  /// is what the word actually means.
  final List<String> synonyms;
  /// The literal image behind a figurative expression, when there is one:
  /// "буквально: бросили под автобус".
  final String? senseNote;
  final int? timecodeMs;
  final bool archived;
  final DateTime createdAt;
  /// The complete subtitle line, when the source sent one. It keeps a
  /// polysemous word tied to the meaning that is actually practised.
  final String? context;

  factory StudyCard.fromJson(Map<String, dynamic> json) => StudyCard(
    id: json['id'] as String,
    mediaTitle: json['media_title'] as String? ?? 'Unknown title',
    season: json['season'] as String?,
    episode: json['episode'] as String?,
    timecodeMs: json['timecode_ms'] as int?,
    selectedText: json['selected_text'] as String? ?? '',
    translation: json['translation'] as String? ?? '',
    focusWord: json['focus_word'] as String?,
    focusPhrase: json['focus_phrase'] as String?,
    focusTranslation: json['focus_translation'] as String?,
    synonyms: (json['synonyms'] as List? ?? [])
        .map((value) => value.toString())
        .where((value) => value.isNotEmpty)
        .toList(),
    senseNote: (json['sense_note'] as String?)?.trim().isNotEmpty == true
        ? (json['sense_note'] as String).trim()
        : null,
    archived: json['archived'] as bool? ?? false,
    createdAt:
        DateTime.tryParse(json['created_at'] as String? ?? '')?.toLocal() ??
        DateTime.now(),
    context: (json['context'] as String?)?.trim().isNotEmpty == true
        ? (json['context'] as String).trim()
        : null,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'media_title': mediaTitle,
    'season': season,
    'episode': episode,
    'timecode_ms': timecodeMs,
    'selected_text': selectedText,
    'translation': translation,
    'focus_word': focusWord,
    'focus_phrase': focusPhrase,
    'focus_translation': focusTranslation,
    'synonyms': synonyms,
    'sense_note': senseNote,
    'archived': archived,
    'created_at': createdAt.toIso8601String(),
    'context': context,
  };

  /// Season/episode/timecode as separate chips rather than one pipe-joined
  /// string, so the card can lay them out instead of printing a run-on line.
  List<String> get sourceChips => [
    if (season != null) 'S$season',
    if (episode != null) 'E$episode',
    if (timecodeMs != null) timecode(timecodeMs!),
  ];

  String get learningLabel => focusPhrase?.isNotEmpty == true
      ? focusPhrase!
      : focusWord?.isNotEmpty == true
      ? focusWord!
      : selectedText;

  /// True when the saved selection is a full phrase rather than a single word.
  bool get isSentenceSelection =>
      RegExp(r'[A-Za-zÀ-ÖØ-öø-ÿ]+\s+[A-Za-zÀ-ÖØ-öø-ÿ]+').hasMatch(selectedText);

  String get cardTitle => isSentenceSelection ? selectedText : learningLabel;

  String get cardTranslation => isSentenceSelection
      ? translation
      : focusTranslation?.isNotEmpty == true
      ? focusTranslation!
      : translation;

  /// The meaning shown directly under the headword.
  String get primaryMeaning => focusTranslation?.isNotEmpty == true
      ? focusTranslation!
      : translation;

  /// The surrounding line, shown only when it adds something the headword and
  /// its meaning do not already say. Trailing punctuation and case are ignored
  /// in the comparison so a card does not quote "Explicitly." back at a
  /// headword that already reads "Explicitly".
  String? get contextLine {
    final text = (context?.trim().isNotEmpty == true ? context : selectedText)
            ?.trim() ??
        '';
    if (text.isEmpty) return null;
    if (bare(text) == bare(learningLabel)) return null;
    return text;
  }

  /// Lower-cased, punctuation-free form used to tell two pieces of text apart
  /// for display purposes.
  static String bare(String value) => value
      .toLowerCase()
      .replaceAll(RegExp(r'''[\s.,!?;:'"«»„“”\---…()\[\]]+'''), ' ')
      .trim();

  Map<String, String> get companionMap => {
    'word': learningLabel,
    'translation': focusTranslation?.isNotEmpty == true
        ? focusTranslation!
        : translation,
    'source': mediaTitle,
  };
}

/// Getting a fresh session without bothering anybody.
///
/// A session eventually runs out. When it does, the phone is still signed in
/// to Google, so it can ask Google for a new identity token and trade that for
/// a new session - no screen, no interruption. Only if Google refuses does the
/// person see the sign-in screen again.
class SessionRenewal {
  static Future<Session?> attempt(Session old) async {
    try {
      await GoogleSignIn.instance.initialize(serverClientId: googleServerClientId);
      final account = await GoogleSignIn.instance.attemptLightweightAuthentication();
      // `authentication` is already a value in google_sign_in 7.  Awaiting it
      // did nothing except leave the analyzer warning that stopped a release
      // build; a null account still means Google cannot restore this session.
      final idToken = account?.authentication.idToken;
      if (idToken == null || idToken.isEmpty) return null;
      final session = await SyncApi.authenticateGoogle(
        baseUrl: old.baseUrl,
        idToken: idToken,
      );
      await SessionStore.save(session);
      return session;
    } catch (_) {
      // Signed in with a code rather than Google, or offline: the sign-in
      // screen is the honest answer.
      return null;
    }
  }
}

class StudyCache {
  static String _key(Session session) =>
      'study_cards_${Uri.encodeComponent(session.email.toLowerCase())}';

  static Future<List<StudyCard>> load(Session session) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key(session));
    if (raw == null || raw.isEmpty) return const [];
    try {
      final value = jsonDecode(raw);
      if (value is! List) return const [];
      return value
          .whereType<Map>()
          .map((item) => StudyCard.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  static Future<void> save(Session session, List<StudyCard> cards) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key(session),
      jsonEncode(cards.map((card) => card.toJson()).toList()),
    );
  }
}

/// Everything a card holds, kept for the times there is no signal.
///
/// The list of words already survives offline; opening one of them used to say
/// "Details unavailable" and show nothing, which is exactly when someone on a
/// train wants to read the examples again. Every card that has been opened once
/// is kept, newest first, up to a few hundred - a few hundred kilobytes.
class DetailCache {
  static const _key = 'card_details';
  static const _limit = 300;

  static Future<Map<String, dynamic>?> load(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return null;
    try {
      final value = jsonDecode(raw);
      if (value is! Map) return null;
      final item = value[id];
      return item is Map ? Map<String, dynamic>.from(item) : null;
    } catch (_) {
      return null;
    }
  }

  static Future<void> save(String id, Map<String, dynamic> detail) async {
    final prefs = await SharedPreferences.getInstance();
    Map<String, dynamic> all = {};
    try {
      final value = jsonDecode(prefs.getString(_key) ?? '{}');
      if (value is Map) all = Map<String, dynamic>.from(value);
    } catch (_) {
      all = {};
    }
    // Re-inserting moves the card to the end, so the oldest untouched ones are
    // the first to go when the cache is full.
    all.remove(id);
    all[id] = detail;
    while (all.length > _limit) {
      all.remove(all.keys.first);
    }
    await prefs.setString(_key, jsonEncode(all));
  }
}

/// An example sentence and, when the server could produce one, its Russian
/// translation. Older cards were stored as a bare string, so both shapes are
/// accepted and a card saved before the change still renders.
class StudyExample {
  const StudyExample({required this.text, this.translation});

  final String text;
  final String? translation;

  factory StudyExample.fromJson(dynamic value) {
    if (value is Map) {
      final translation = value['translation']?.toString().trim();
      return StudyExample(
        text: value['text']?.toString().trim() ?? '',
        translation: translation?.isNotEmpty == true ? translation : null,
      );
    }
    // Legacy rows packed both halves into "sentence - перевод".
    final raw = value.toString().trim();
    for (final separator in const [' - ', ' - ', ' -- ']) {
      final index = raw.indexOf(separator);
      if (index > 0) {
        return StudyExample(
          text: raw.substring(0, index).trim(),
          translation: raw.substring(index + separator.length).trim(),
        );
      }
    }
    return StudyExample(text: raw);
  }
}

class StudyDetail extends StudyCard {
  const StudyDetail({
    required super.id,
    required super.mediaTitle,
    required super.season,
    required super.episode,
    required super.timecodeMs,
    required super.selectedText,
    required super.translation,
    required super.focusWord,
    required super.focusPhrase,
    required super.focusTranslation,
    required super.synonyms,
    required super.senseNote,
    required super.archived,
    required super.createdAt,
    super.context,
    required this.variants,
    required this.examples,
  });
  final List<String> variants;
  final List<StudyExample> examples;

  factory StudyDetail.fromJson(Map<String, dynamic> json) {
    final card = StudyCard.fromJson(json);
    return StudyDetail(
      id: card.id,
      mediaTitle: card.mediaTitle,
      season: card.season,
      episode: card.episode,
      timecodeMs: card.timecodeMs,
      selectedText: card.selectedText,
      translation: card.translation,
      focusWord: card.focusWord,
      focusPhrase: card.focusPhrase,
      focusTranslation: card.focusTranslation,
      synonyms: card.synonyms,
      senseNote: card.senseNote,
      archived: card.archived,
      createdAt: card.createdAt,
      context: card.context,
      variants: (json['variants'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
      examples: (json['examples'] as List? ?? [])
          .map(StudyExample.fromJson)
          .where((example) => example.text.isNotEmpty)
          .toList(),
    );
  }
}

String timecode(int milliseconds) {
  final seconds = milliseconds ~/ 1000;
  String pad(int number) => number.toString().padLeft(2, '0');
  final hours = seconds ~/ 3600;
  final rest = '${pad((seconds ~/ 60) % 60)}:${pad(seconds % 60)}';
  return hours == 0 ? rest : '${pad(hours)}:$rest';
}

enum AchievementTone { green, blue, amber, purple, red }

/// A cumulative goal with tiers. Nothing here expires or resets: progress only
/// ever moves forward, so putting the app down for a month costs nothing.
class Achievement {
  const Achievement({
    required this.id,
    required this.title,
    required this.icon,
    required this.tone,
    required this.tiers,
    required this.value,
    required this.goal,
  });

  final String id, title;
  final IconData icon;
  final AchievementTone tone;
  final List<int> tiers;
  final int value;

  /// The sentence shown under the title, as an English key with `%d` where
  /// the target goes. It is translated where it is drawn: this class has no
  /// widget tree to ask, and a sentence built here would be English forever.
  final String Function(int target) goal;

  /// Tiers already passed.
  int get level => tiers.where((tier) => value >= tier).length;
  bool get complete => level >= tiers.length;
  int get target => complete ? tiers.last : tiers[level];
  int get _floor => level == 0 ? 0 : tiers[level - 1];

  /// Fills from the previous tier to the next, so each level starts fresh
  /// instead of the bar crawling for the last hundred.
  double get progress => complete
      ? 1
      : ((value - _floor) / (target - _floor)).clamp(0.0, 1.0);

  String get description => goal(target);
}

/// Study statistics derived from the cards themselves. Every number is a plain
/// count of something the user actually saved.
class StudyStats {
  const StudyStats({
    required this.total,
    required this.active,
    required this.learned,
    required this.sources,
    required this.series,
    required this.phrases,
    required this.longestRun,
    required this.achievements,
  });

  final int total, active, learned, sources, series, phrases, longestRun;
  final List<Achievement> achievements;

  /// Closest achievement to its next tier - the one worth showing first.
  Achievement? get nextUp {
    final open = achievements.where((item) => !item.complete).toList()
      ..sort((a, b) => b.progress.compareTo(a.progress));
    return open.isEmpty ? null : open.first;
  }

  int get unlocked =>
      achievements.fold(0, (sum, item) => sum + item.level);

  factory StudyStats.from(
    List<StudyCard> active, [
    List<StudyCard> archived = const [],
  ]) {
    final all = [...active, ...archived];
    final sources = all.map((card) => card.mediaTitle).toSet();
    final series = all
        .where((card) => card.season != null || card.episode != null)
        .map((card) => card.mediaTitle)
        .toSet();
    final phrases = all
        .where((card) => card.learningLabel.trim().contains(' '))
        .length;

    // Deepest single series: how many distinct episodes one show has given up.
    final episodesPerSeries = <String, Set<String>>{};
    for (final card in all) {
      if (card.season == null && card.episode == null) continue;
      (episodesPerSeries[card.mediaTitle] ??= {})
          .add('${card.season ?? '-'}x${card.episode ?? '-'}');
    }
    final longestRun = episodesPerSeries.values.fold<int>(
      0,
      (best, episodes) => episodes.length > best ? episodes.length : best,
    );

    return StudyStats(
      total: all.length,
      active: active.length,
      learned: archived.length,
      sources: sources.length,
      series: series.length,
      phrases: phrases,
      longestRun: longestRun,
      achievements: [
        Achievement(
          id: 'collector',
          title: 'Collector',
          icon: Icons.style_rounded,
          tone: AchievementTone.green,
          tiers: const [1, 10, 25, 50, 100, 250],
          value: all.length,
          goal: (target) => target == 1
              ? 'Save your first word'
              : 'Save %d words in total',
        ),
        Achievement(
          id: 'series',
          title: 'Channel surfer',
          icon: Icons.live_tv_rounded,
          tone: AchievementTone.purple,
          tiers: const [1, 3, 5, 10, 20],
          value: series.length,
          goal: (target) => target == 1
              ? 'Save a word from a series'
              : 'Take words from %d different series',
        ),
        Achievement(
          id: 'sources',
          title: 'Wide net',
          icon: Icons.movie_rounded,
          tone: AchievementTone.blue,
          tiers: const [2, 5, 10, 25],
          value: sources.length,
          goal: (target) => 'Catch words in %d different videos',
        ),
        Achievement(
          id: 'binge',
          title: 'Deep dive',
          icon: Icons.playlist_add_check_rounded,
          tone: AchievementTone.amber,
          tiers: const [3, 10, 25],
          value: longestRun,
          goal: (target) => 'Pick up words in %d episodes of one series',
        ),
        Achievement(
          id: 'phrases',
          title: 'Phrasebook',
          icon: Icons.format_quote_rounded,
          tone: AchievementTone.red,
          tiers: const [5, 15, 40],
          value: phrases,
          goal: (target) => 'Save %d expressions, not single words',
        ),
        Achievement(
          id: 'learned',
          title: 'Retired',
          icon: Icons.workspace_premium_rounded,
          tone: AchievementTone.green,
          tiers: const [1, 10, 30, 75],
          value: archived.length,
          goal: (target) => target == 1
              ? 'Move a word to Learned'
              : 'Move %d words to Learned',
        ),
      ],
    );
  }
}
