import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart';
import '../design/tokens.dart';
import '../i18n.dart';
import 'friends.dart';
import 'games.dart';
import 'learned.dart';
import 'library.dart';
import 'nickname_sheet.dart';
import 'settings.dart';

/// Owns the active card list so the library, the learned archive and the
/// profile stats all read from one source instead of each fetching its own.
class HomeShell extends StatefulWidget {
  const HomeShell({
    required this.session,
    required this.settings,
    required this.onSettingsChanged,
    required this.onSignOut,
    required this.onSessionRenewed,
    super.key,
  });

  final Session session;
  final AppSettings settings;
  final ValueChanged<AppSettings> onSettingsChanged;
  final VoidCallback onSignOut;
  final ValueChanged<Session> onSessionRenewed;

  @override
  State<HomeShell> createState() => HomeShellState();
}

class HomeShellState extends State<HomeShell> {
  // Not `late final`: a renewed session is a different token, and everything
  // that talks to the server has to pick it up.
  SyncApi get api => SyncApi(widget.session);

  final _friendsKey = GlobalKey<FriendsTabState>();

  List<StudyCard> _cards = const [];
  List<StudyCard> _learned = const [];
  Profile? _profile;
  bool _askNickname = false;
  Object? _error;
  bool _loading = true;
  bool _offline = false;
  bool _renewing = false;
  int _tab = 0;

  /// Turning on the simple interface while standing on Practice would leave
  /// the tab bar with nothing selected and no way back to that screen.
  @override
  void didUpdateWidget(covariant HomeShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.settings.simpleMode && _tab != 0 && _tab != 4) {
      setState(() => _tab = 0);
    }
  }

  Profile? get profile => _profile;

  List<StudyCard> get cards => _cards;

  /// Achievements count everything ever saved, so the archive is part of the
  /// picture and lives here rather than inside the Learned tab.
  StudyStats get stats => StudyStats.from(_cards, _learned);

  @override
  void initState() {
    super.initState();
    _hydrateThenLoad();
  }

  /// The profile drives the nickname prompt and the friends screens, so it is
  /// fetched alongside the cards rather than on first visit to a tab.
  Future<void> loadProfile() async {
    try {
      final profile = await api.me();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        // Asked once, right after the first sign-in. Without a nickname the
        // account cannot be found by anyone.
        _askNickname = profile.needsNickname;
      });
    } catch (error) {
      if (await _renew(error)) return loadProfile();
      // Offline: the rest of the app works without it.
    }
  }

  Future<void> _hydrateThenLoad() async {
    final cached = await StudyCache.load(widget.session);
    if (mounted && cached.isNotEmpty) {
      setState(() {
        _cards = cached;
        _loading = false;
        _offline = true;
      });
    }
    await reload();
    await loadProfile();
  }

  /// True once the session has been renewed and the caller should try again.
  ///
  /// Runs at most once per attempt: if Google cannot vouch for the phone
  /// either, the session is dropped and the sign-in screen comes back with a
  /// word about why, instead of the library showing "Unauthorized" for ever.
  Future<bool> _renew(Object error) async {
    if (error is! ApiException || !error.expired || _renewing) return false;
    _renewing = true;
    final fresh = await SessionRenewal.attempt(widget.session);
    _renewing = false;
    if (fresh != null) {
      widget.onSessionRenewed(fresh);
      return true;
    }
    await SessionStore.clear();
    if (mounted) widget.onSignOut();
    return false;
  }

  Future<void> reload() async {
    setState(() {
      _loading = _cards.isEmpty;
      _error = null;
    });
    try {
      final results = await Future.wait([
        api.cards(),
        api.cards(archived: true),
      ]);
      _cards = results[0];
      _learned = results[1];
      await StudyCache.save(widget.session, _cards);
      await NativeBridge.syncCompanionCards(_cards);
      _offline = false;
    } catch (error) {
      if (await _renew(error)) {
        // The session was renewed; the api object below now carries the new
        // token, so one more attempt is all it takes.
        return reload();
      }
      _offline = true;
      if (_cards.isEmpty) _error = error;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Removes the card locally after the server has confirmed the change.
  ///
  /// The list updates immediately; the cache write and the widget refresh are
  /// deliberately not awaited. They used to run while the row was collapsing,
  /// which is exactly when a frame cannot be spared.
  Future<void> _forget(StudyCard card) async {
    setState(() => _cards = _cards.where((item) => item.id != card.id).toList());
    _persistInBackground();
  }

  void _persistInBackground() {
    final snapshot = List<StudyCard>.of(_cards);
    // After the current frame, so the removal animation owns the main thread
    // until it is done.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await StudyCache.save(widget.session, snapshot);
      try {
        await NativeBridge.syncCompanionCards(snapshot);
      } catch (_) {
        // The widget failing to refresh must not surface in the library.
      }
    });
  }

  Future<bool> archive(StudyCard card) async {
    try {
      await api.setArchived(card.id, archived: true);
    } on ApiException catch (error) {
      _notify(error.message, tone: _Tone.error);
      return false;
    }
    await _forget(card);
    setState(() => _learned = [card, ..._learned]);
    _notify('“${card.learningLabel}” marked as learned', tone: _Tone.success);
    return true;
  }

  Future<bool> restore(StudyCard card) async {
    try {
      await api.setArchived(card.id, archived: false);
    } on ApiException catch (error) {
      _notify(error.message, tone: _Tone.error);
      return false;
    }
    if (!mounted) return true;
    setState(() {
      _learned = _learned.where((item) => item.id != card.id).toList();
      _cards = [card, ..._cards];
    });
    _persistInBackground();
    _notify('“${card.learningLabel}” is back in your library');
    return true;
  }

  Future<bool> delete(StudyCard card) async {
    try {
      await api.delete(card.id);
    } on ApiException catch (error) {
      _notify(error.message, tone: _Tone.error);
      return false;
    }
    await _forget(card);
    _notify('“${card.learningLabel}” deleted');
    return true;
  }

  void _notify(String message, {_Tone tone = _Tone.plain}) {
    if (!mounted) return;
    final c = context.c;
    final background = switch (tone) {
      _Tone.success => c.green,
      _Tone.error => c.red,
      _Tone.plain => c.ink,
    };
    final ink = switch (tone) {
      _Tone.success => c.onGreen,
      _Tone.error => c.onRed,
      _Tone.plain => c.surface,
    };
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: background,
          duration: const Duration(seconds: 3),
          content: Row(
            children: [
              Icon(
                switch (tone) {
                  _Tone.success => Icons.check_circle_rounded,
                  _Tone.error => Icons.error_rounded,
                  _Tone.plain => Icons.info_rounded,
                },
                color: ink,
                size: 20,
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Text(
                  message,
                  style: font(size: 15, weight: 700, color: ink, height: 1.3),
                ),
              ),
            ],
          ),
        ),
      );
  }

  Future<void> _openSignOut() async {
    await SessionStore.clear();
    widget.onSignOut();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final profile = _profile;
    return Scaffold(
      backgroundColor: c.bg,
      body: Stack(
        children: [
          SafeArea(
        bottom: false,
        child: IndexedStack(
          index: _tab,
          children: [
            LibraryTab(
              cards: _cards,
              stats: stats,
              settings: widget.settings,
              loading: _loading,
              error: _error,
              offline: _offline,
              api: api,
              onReload: reload,
              onArchive: archive,
              onDelete: delete,
              onSettingsChanged: widget.onSettingsChanged,
            ),
            LearnedTab(
              cards: _learned,
              loading: _loading,
              error: _error,
              onReload: reload,
              onRestore: restore,
            ),
            GamesTab(cards: _cards),
            FriendsTab(key: _friendsKey, api: api, profile: _profile),
            SettingsTab(
              session: widget.session,
              settings: widget.settings,
              stats: stats,
              cards: _cards,
              api: api,
              profile: _profile,
              onSettingsChanged: widget.onSettingsChanged,
              onProfileChanged: (value) => setState(() => _profile = value),
              onEditNickname: () => setState(() => _askNickname = true),
              onSignOut: _openSignOut,
            ),
          ],
        ),
      ),
          if (_askNickname && profile != null)
            NicknameSheet(
              api: api,
              profile: profile,
              firstTime: profile.needsNickname,
              onSaved: (value) => setState(() => _profile = value),
              onClose: () => setState(() => _askNickname = false),
            ),
        ],
      ),
      bottomNavigationBar: _TabBar(
        index: _tab,
        // Simple mode is not a different app, only a shorter way through this
        // one: the same screens are still mounted, three of the five doors are
        // just not shown.
        visible: widget.settings.simpleMode ? const [0, 4] : const [0, 1, 2, 3, 4],
        onChanged: (value) {
          if (value == _tab) return;
          HapticFeedback.selectionClick();
          setState(() => _tab = value);
          if (value == 3) _friendsKey.currentState?.reload();
        },
      ),
    );
  }
}

enum _Tone { plain, success, error }

class _TabBar extends StatelessWidget {
  const _TabBar({
    required this.index,
    required this.onChanged,
    required this.visible,
  });

  final int index;
  final ValueChanged<int> onChanged;
  final List<int> visible;

  static const _items = [
    (icon: Icons.style_rounded, label: 'Library'),
    (icon: Icons.workspace_premium_rounded, label: 'Learned'),
    (icon: Icons.sports_esports_rounded, label: 'Practice'),
    (icon: Icons.people_alt_rounded, label: 'Friends'),
    (icon: Icons.person_rounded, label: 'You'),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(top: BorderSide(color: c.line, width: 1.5)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 62,
          child: Row(
            children: [
              for (final i in visible)
                Expanded(
                  child: _TabItem(
                    icon: _items[i].icon,
                    label: context.t(_items[i].label),
                    selected: i == index,
                    onTap: () => onChanged(i),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TabItem extends StatelessWidget {
  const _TabItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final tint = selected ? c.green : c.ink3;
    return Semantics(
      selected: selected,
      button: true,
      label: label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpace.xs,
            vertical: AppSpace.sm,
          ),
          child: AnimatedContainer(
            duration: AppMotion.quick,
            curve: AppMotion.enter,
            decoration: BoxDecoration(
              color: selected ? c.greenWash : Colors.transparent,
              borderRadius: BorderRadius.circular(AppRadius.button),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 23, color: tint),
                const SizedBox(height: 3),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: font(
                    size: 10.5,
                    weight: selected ? 800 : 700,
                    color: tint,
                    height: 1.1,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Transient pill shown while a shared selection is being saved in the
/// background.
class SavingPill extends StatelessWidget {
  const SavingPill({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      margin: const EdgeInsets.only(top: AppSpace.md),
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.lg,
        vertical: AppSpace.md,
      ),
      decoration: BoxDecoration(
        color: c.ink,
        borderRadius: BorderRadius.circular(AppRadius.chip),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2.4,
              color: c.greenBright,
              strokeCap: StrokeCap.round,
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Text(
            context.t('Saving to your library'),
            style: font(size: 14, weight: 800, color: c.surface, height: 1.2),
          ),
        ],
      ),
    );
  }
}
